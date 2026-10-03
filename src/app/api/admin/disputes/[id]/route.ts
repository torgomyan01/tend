import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  escrowStatusChangeMessage,
  postEscrowSystemMessage,
} from "@/lib/escrow-messages";
import { notifyEscrowDisputeResolved } from "@/lib/escrow-dispute-resolved-notify";
import { formatAmd } from "@/lib/format";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["SAVE_NOTE", "RELEASE_TO_PROVIDER", "REFUND_TO_CLIENT"]),
  adminNote: z.string().trim().max(2000).optional(),
  resolutionNote: z.string().trim().max(2000).optional(),
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
      disputedAt: true,
      adminNote: true,
      tender: { select: { title: true } },
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const now = new Date();
  const adminId = session.user.id;
  const note = parsed.data.adminNote ?? null;
  const resolution = parsed.data.resolutionNote?.trim() || null;

  if (parsed.data.action === "SAVE_NOTE") {
    if (escrow.status !== "DISPUTED") {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
    }
    await prisma.tenderEscrow.update({
      where: { id: escrow.id },
      data: { adminNote: note },
    });
    return NextResponse.json({ ok: true, status: "DISPUTED" });
  }

  if (escrow.status !== "DISPUTED") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  if (parsed.data.action === "RELEASE_TO_PROVIDER") {
    await prisma.tenderEscrow.update({
      where: { id: escrow.id },
      data: {
        status: "RELEASED",
        releasedAt: now,
        releasedByAdminId: adminId,
        adminNote: note ?? escrow.adminNote,
      },
    });

    const extra = [
      `Վեճը լուծված է ադմինի կողմից։ Կատարողին փոխանցված է ${formatAmd(Number(escrow.providerReceives))}։`,
      resolution ? `Որոշում՝ ${resolution}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await postEscrowSystemMessage({
        contractId: escrow.contractId,
        body: escrowStatusChangeMessage("RELEASED", extra),
      });
    } catch {
      /* non-blocking */
    }

    try {
      await notifyEscrowDisputeResolved({
        clientId: escrow.clientId,
        providerId: escrow.providerId,
        tenderId: escrow.tenderId,
        tenderTitle: escrow.tender.title,
        contractId: escrow.contractId,
        outcome: "RELEASED",
        amount: Number(escrow.providerReceives),
        resolutionNote: resolution,
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({ ok: true, status: "RELEASED" });
  }

  // REFUND_TO_CLIENT
  await prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "REFUNDED",
      refundedAt: now,
      adminNote: note ?? escrow.adminNote,
    },
  });

  const refundExtra = [
    `Վեճը լուծված է ադմինի կողմից։ Պատվիրատուին վերադարձված է ${formatAmd(Number(escrow.contractAmount))}։`,
    resolution ? `Որոշում՝ ${resolution}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await postEscrowSystemMessage({
      contractId: escrow.contractId,
      body: escrowStatusChangeMessage("REFUNDED", refundExtra),
    });
  } catch {
    /* non-blocking */
  }

  try {
    await notifyEscrowDisputeResolved({
      clientId: escrow.clientId,
      providerId: escrow.providerId,
      tenderId: escrow.tenderId,
      tenderTitle: escrow.tender.title,
      contractId: escrow.contractId,
      outcome: "REFUNDED",
      amount: Number(escrow.contractAmount),
      resolutionNote: resolution,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, status: "REFUNDED" });
}
