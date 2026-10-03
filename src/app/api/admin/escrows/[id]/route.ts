import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  escrowFundedMessage,
  escrowStatusChangeMessage,
  postEscrowSystemMessage,
} from "@/lib/escrow-messages";
import { notifyEscrowFunded } from "@/lib/escrow-funded-notify";
import { formatAmd } from "@/lib/format";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["CONFIRM_FUNDING", "CONFIRM_RELEASE", "REFUND", "CANCEL"]),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const escrow = await prisma.tenderEscrow.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      contractId: true,
      tenderId: true,
      clientId: true,
      providerId: true,
      paymentCode: true,
      contractAmount: true,
      providerReceives: true,
      tender: { select: { title: true } },
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const now = new Date();
  const adminId = session.user.id;
  const note = parsed.data.adminNote ?? null;

  if (parsed.data.action === "CONFIRM_FUNDING") {
    if (escrow.status !== "PAYMENT_SUBMITTED" && escrow.status !== "PENDING_FUNDING") {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
    }
    await prisma.tenderEscrow.update({
      where: { id: escrow.id },
      data: {
        status: "FUNDED",
        fundedAt: now,
        fundedByAdminId: adminId,
        adminNote: note,
      },
    });
    try {
      await postEscrowSystemMessage({
        contractId: escrow.contractId,
        body: escrowFundedMessage({
          amount: Number(escrow.contractAmount),
          paymentCode: escrow.paymentCode,
        }),
      });
    } catch {
      /* non-blocking */
    }
    try {
      await notifyEscrowFunded({
        clientId: escrow.clientId,
        providerId: escrow.providerId,
        tenderId: escrow.tenderId,
        tenderTitle: escrow.tender.title,
        contractId: escrow.contractId,
        amount: Number(escrow.contractAmount),
        paymentCode: escrow.paymentCode,
      });
    } catch {
      /* non-blocking */
    }
    return NextResponse.json({ ok: true, status: "FUNDED" });
  }

  if (parsed.data.action === "CONFIRM_RELEASE") {
    if (
      escrow.status !== "RELEASE_PENDING" &&
      escrow.status !== "DISPUTED" &&
      escrow.status !== "FUNDED"
    ) {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
    }
    await prisma.tenderEscrow.update({
      where: { id: escrow.id },
      data: {
        status: "RELEASED",
        releasedAt: now,
        releasedByAdminId: adminId,
        adminNote: note,
      },
    });
    try {
      await postEscrowSystemMessage({
        contractId: escrow.contractId,
        body: escrowStatusChangeMessage(
          "RELEASED",
          `Կատարողին փոխանցված է ${formatAmd(Number(escrow.providerReceives))}։`,
        ),
      });
    } catch {
      /* non-blocking */
    }
    return NextResponse.json({ ok: true, status: "RELEASED" });
  }

  if (parsed.data.action === "REFUND") {
    if (
      escrow.status !== "DISPUTED" &&
      escrow.status !== "FUNDED" &&
      escrow.status !== "PAYMENT_SUBMITTED" &&
      escrow.status !== "RELEASE_PENDING"
    ) {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
    }
    await prisma.tenderEscrow.update({
      where: { id: escrow.id },
      data: {
        status: "REFUNDED",
        refundedAt: now,
        adminNote: note,
      },
    });
    try {
      await postEscrowSystemMessage({
        contractId: escrow.contractId,
        body: escrowStatusChangeMessage(
          "REFUNDED",
          `Պատվիրատուին վերադարձված է ${formatAmd(Number(escrow.contractAmount))}։`,
        ),
      });
    } catch {
      /* non-blocking */
    }
    return NextResponse.json({ ok: true, status: "REFUNDED" });
  }

  // CANCEL
  if (
    escrow.status !== "AWAITING_CONTRACT" &&
    escrow.status !== "PENDING_FUNDING" &&
    escrow.status !== "PAYMENT_SUBMITTED"
  ) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }
  await prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      adminNote: note,
    },
  });
  try {
    await postEscrowSystemMessage({
      contractId: escrow.contractId,
      body: escrowStatusChangeMessage("CANCELLED"),
    });
  } catch {
    /* non-blocking */
  }
  return NextResponse.json({ ok: true, status: "CANCELLED" });
}
