import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const depositSchema = z.object({
  amount: z.number().int().min(500).max(50_000_000),
});

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

  try {
    const userId = session.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, isBlocked: true },
      });

      if (!user) {
        throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      }

      if (user.isBlocked) {
        throw Object.assign(new Error("USER_BLOCKED"), {
          code: "USER_BLOCKED",
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          status: "SUCCEEDED",
          amount,
          currency: "AMD",
          description: "Դրամապանակի լիցքավորում",
        },
      });

      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });

      return { balance: Number(updated!.walletBalance) };
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error: unknown) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (code === "USER_BLOCKED") {
      return NextResponse.json({ error: "USER_BLOCKED" }, { status: 403 });
    }
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    console.error("[POST /api/account/wallet]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
