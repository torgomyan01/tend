import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { notifyProviderBidModerationApproved } from "@/lib/bid-moderation-approved-notify";
import { prisma } from "@/lib/prisma";
import { notifyTenderOwnerNewBid } from "@/lib/tender-owner-new-bid-notify";
import { refundSingleBidAsCredit } from "@/lib/bid-fee-refund";
import {
  notifyProviderBidFeeRefunded,
  REFUND_REASON_LABELS,
} from "@/lib/bid-fee-refund-notify";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(800).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const bid = await prisma.bid.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      price: true,
      timelineDays: true,
      coverLetter: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      tender: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true } },
        },
      },
    },
  });

  if (!bid) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (bid.status !== "PENDING") {
    return NextResponse.json({ error: "NOT_IN_REVIEW" }, { status: 409 });
  }

  const isApprove = parsed.data.action === "APPROVE";

  const refunded = await prisma.$transaction(async (tx) => {
    await tx.bid.update({
      where: { id: bid.id },
      data: {
        status: isApprove ? "SHORTLISTED" : "REJECTED",
      },
    });
    if (isApprove) return null;
    return refundSingleBidAsCredit(tx, bid.id, "BID_REJECTED_BY_MODERATOR");
  });

  if (refunded) {
    try {
      await notifyProviderBidFeeRefunded(
        refunded,
        REFUND_REASON_LABELS.BID_REJECTED_BY_MODERATOR,
      );
    } catch {
      /* Telegram failures must not block moderation */
    }
  }

  if (isApprove) {
    try {
      await notifyTenderOwnerNewBid({
        userId: bid.tender.client.id,
        tenderTitle: bid.tender.title,
        tenderId: bid.tender.id,
        providerDisplayName:
          bid.provider.name?.trim() || bid.provider.email,
        providerEmail: bid.provider.email,
        providerPhone: bid.provider.phone,
        priceAmd: Number(bid.price),
        timelineDays: bid.timelineDays ?? 1,
        coverLetter: bid.coverLetter,
      });
      await notifyProviderBidModerationApproved({
        userId: bid.provider.id,
        tenderTitle: bid.tender.title,
        tenderId: bid.tender.id,
      });
    } catch {
      /* Telegram failures must not undo moderation */
    }
  }

  return NextResponse.json({ ok: true });
}
