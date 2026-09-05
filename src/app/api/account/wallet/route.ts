import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { absoluteAppUrlFromRequest } from "@/lib/absolute-app-url";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { vposCreateOrder, vposRegisterCustomer } from "@/lib/vpos/client";
import {
  VPOS_DEPOSIT_MAX,
  VPOS_DEPOSIT_MIN,
  VPOS_GATEWAY,
} from "@/lib/vpos/config";

export const dynamic = "force-dynamic";

const depositSchema = z.object({
  amount: z.number().int().min(VPOS_DEPOSIT_MIN).max(VPOS_DEPOSIT_MAX),
});

function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Tend", lastName: undefined as string | undefined };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletBalance: true, isBlocked: true },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    balance: Number(user.walletBalance),
    isBlocked: user.isBlocked,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = depositSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const amount = parsed.data.amount;
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "USER_BLOCKED" }, { status: 403 });
    }

    if (!user.phone?.trim()) {
      return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
    }

    const { firstName, lastName } = splitName(user.name);

    let customerRes;
    try {
      customerRes = await vposRegisterCustomer({
        customerID: user.id,
        firstName,
        lastName,
        phoneNumber: user.phone.trim(),
        email: user.email,
      });
    } catch (error) {
      console.error("[POST /api/account/wallet] customer register", error);
      return NextResponse.json({ error: "VPOS_UNAVAILABLE" }, { status: 502 });
    }

    const customerOk =
      customerRes.body?.status === true ||
      /already exists/i.test(customerRes.raw);
    if (!customerOk) {
      console.error(
        "[POST /api/account/wallet] customer register failed",
        customerRes.raw,
      );
      return NextResponse.json(
        {
          error: "VPOS_CUSTOMER_FAILED",
          message: customerRes.body?.message ?? "Customer register failed",
        },
        { status: 502 },
      );
    }

    const seq = await prisma.vposOrderSequence.create({ data: {} });
    const orderNumber = seq.id;

    const pending = await prisma.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        status: "PENDING",
        amount,
        currency: "AMD",
        gateway: VPOS_GATEWAY,
        orderNumber,
        description: "Դրամապանակի լիցքավորում (VPOS, սպասում)",
      },
      select: { id: true, orderNumber: true },
    });

    const backURL = absoluteAppUrlFromRequest(
      ROUTES.accountWalletReturn(orderNumber),
      request,
    );

    let orderRes;
    try {
      orderRes = await vposCreateOrder({
        customerID: user.id,
        amount,
        orderID: orderNumber,
        backURL,
        description: "Tend դրամապանակի լիցքավորում",
        lang: "hy",
      });
    } catch (error) {
      console.error("[POST /api/account/wallet] order/new", error);
      await prisma.transaction.update({
        where: { id: pending.id },
        data: { status: "FAILED", description: "VPOS կապի սխալ" },
      });
      return NextResponse.json({ error: "VPOS_UNAVAILABLE" }, { status: 502 });
    }

    const redirectURL = orderRes.body?.data?.redirectURL;
    const itfOrderId = orderRes.body?.data?.itfOrderId;

    if (!orderRes.body?.status || !redirectURL) {
      console.error("[POST /api/account/wallet] bad VPOS response", orderRes.raw);
      await prisma.transaction.update({
        where: { id: pending.id },
        data: {
          status: "FAILED",
          description: orderRes.body?.message ?? "VPOS պատասխանը անվավեր է",
        },
      });
      return NextResponse.json(
        {
          error: "VPOS_ORDER_FAILED",
          message: orderRes.body?.message ?? "VPOS order failed",
        },
        { status: 502 },
      );
    }

    await prisma.transaction.update({
      where: { id: pending.id },
      data: {
        gatewayRef: itfOrderId != null ? String(itfOrderId) : undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      redirectURL,
      orderNumber,
      needToRedirect: orderRes.body.data?.needToRedirect ?? true,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "VPOS_KEYS_MISSING"
    ) {
      return NextResponse.json({ error: "VPOS_NOT_CONFIGURED" }, { status: 503 });
    }

    console.error("[POST /api/account/wallet]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
