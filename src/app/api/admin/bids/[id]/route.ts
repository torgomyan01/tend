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
import { ESCROW_BLOCK_UNAWARD_STATUSES } from "@/lib/escrow-service";

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

/**
 * Ադմինը ջնջում է առաջարկը։
 * Եթե գումարը արդեն escrow շրջանառության մեջ է՝ արգելվում է։
 * Մուտքի վճարը (եթե կա և դեռ չի վերադարձվել) վերադարձվում է կրեդիտով։
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      tenderId: true,
      tender: {
        select: {
          id: true,
          status: true,
          awardedBidId: true,
        },
      },
      contracts: {
        select: {
          id: true,
          status: true,
          escrow: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!bid) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const blockingEscrow = bid.contracts.find(
    (c) =>
      c.escrow &&
      ESCROW_BLOCK_UNAWARD_STATUSES.includes(c.escrow.status),
  );
  if (blockingEscrow?.escrow) {
    return NextResponse.json(
      {
        error: "ESCROW_ACTIVE",
        status: blockingEscrow.escrow.status,
      },
      { status: 409 },
    );
  }

  const refunded = await prisma.$transaction(async (tx) => {
    const credit = await refundSingleBidAsCredit(
      tx,
      bid.id,
      "BID_DELETED_BY_ADMIN",
    );

    if (bid.tender.awardedBidId === bid.id) {
      await tx.tender.update({
        where: { id: bid.tenderId },
        data: {
          awardedBidId: null,
          awardedAt: null,
          ...(bid.tender.status === "AWARDED"
            ? { status: "ACTIVE" as const }
            : {}),
        },
      });
    }

    const openContractIds = bid.contracts
      .filter((c) => c.status !== "CANCELLED")
      .map((c) => c.id);

    if (openContractIds.length > 0) {
      await tx.tenderEscrow.updateMany({
        where: {
          contractId: { in: openContractIds },
          status: { in: ["AWAITING_CONTRACT", "PENDING_FUNDING"] },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      await tx.tenderContract.updateMany({
        where: { id: { in: openContractIds } },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
        },
      });
    }

    await tx.transaction.updateMany({
      where: { bidId: bid.id },
      data: { bidId: null },
    });

    await tx.bid.delete({ where: { id: bid.id } });

    return credit;
  });

  if (refunded) {
    try {
      await notifyProviderBidFeeRefunded(
        refunded,
        REFUND_REASON_LABELS.BID_DELETED_BY_ADMIN,
      );
    } catch {
      /* notify must not undo delete */
    }
  }

  return NextResponse.json({ ok: true, refunded: Boolean(refunded) });
}
