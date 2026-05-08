import type { Prisma } from "@/generated/prisma/client";

/**
 * Refund/credit rules for bid fees.
 *
 * Business goal:
 * - Trust + retention: when a tender is cancelled/rejected after providers have
 *   already paid the entry fee, the fee must NOT be lost. We return it as a
 *   wallet credit (REFUND transaction + walletBalance increment).
 * - Idempotency: a bid is refunded at most once. We track this on the Bid
 *   record (`bidFeeRefundedAt`, `bidFeeRefundedAmount`) AND via the existence
 *   of a REFUND transaction with `bidId` set.
 *
 * When does a refund apply?
 * 1. Admin cancels a tender (REJECT in REVIEW, SET_STATUS=CANCELLED, UPDATE
 *    status -> CANCELLED) — refund all bids with a positive fee that aren't
 *    already refunded.
 * 2. Admin deletes a tender — same as above (run BEFORE the cascading delete).
 * 3. Admin rejects a bid during moderation — refund just that one bid.
 *
 * Free bids (bidFeeAmount === 0) are skipped (nothing to refund).
 */

export type BidFeeRefundReason =
  | "TENDER_CANCELLED"
  | "TENDER_DELETED"
  | "TENDER_REJECTED"
  | "BID_REJECTED_BY_MODERATOR";

const REASON_DESCRIPTION: Record<BidFeeRefundReason, string> = {
  TENDER_CANCELLED: "Մրցույթը չեղարկվել է",
  TENDER_DELETED: "Մրցույթը հեռացվել է",
  TENDER_REJECTED: "Մրցույթը մերժվել է մոդերացիայի կողմից",
  BID_REJECTED_BY_MODERATOR: "Առաջարկը մերժվել է մոդերացիայի կողմից",
};

type RefundedBidInfo = {
  bidId: string;
  providerId: string;
  amount: number;
  tenderTitle: string;
  tenderId: string;
  providerChatId: string | null;
};

type TxClient = Prisma.TransactionClient;

/** Refund every unrefunded paid bid for a single tender. Returns refunded bids. */
export async function refundTenderBidsAsCredit(
  tx: TxClient,
  tenderId: string,
  reason: BidFeeRefundReason,
): Promise<RefundedBidInfo[]> {
  const tender = await tx.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, title: true },
  });
  if (!tender) return [];

  const bids = await tx.bid.findMany({
    where: {
      tenderId,
      bidFeeRefundedAt: null,
      bidFeeAmount: { gt: 0 },
    },
    select: {
      id: true,
      providerId: true,
      bidFeeAmount: true,
      provider: { select: { telegramChatId: true } },
    },
  });

  const refunded: RefundedBidInfo[] = [];

  for (const bid of bids) {
    const amount = Number(bid.bidFeeAmount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    await tx.user.update({
      where: { id: bid.providerId },
      data: { walletBalance: { increment: amount } },
    });

    await tx.transaction.create({
      data: {
        userId: bid.providerId,
        bidId: bid.id,
        type: "REFUND",
        status: "SUCCEEDED",
        amount,
        currency: "AMD",
        description: `${REASON_DESCRIPTION[reason]}՝ մուտքի վճարը վերադարձված է կրեդիտով · «${tender.title.slice(0, 120)}»`,
      },
    });

    await tx.bid.update({
      where: { id: bid.id },
      data: {
        bidFeeRefundedAt: new Date(),
        bidFeeRefundedAmount: amount,
        bidFeeRefundReason: reason,
      },
    });

    refunded.push({
      bidId: bid.id,
      providerId: bid.providerId,
      amount,
      tenderTitle: tender.title,
      tenderId: tender.id,
      providerChatId: bid.provider.telegramChatId,
    });
  }

  return refunded;
}

/** Refund a single bid (used when an admin moderator rejects a bid). */
export async function refundSingleBidAsCredit(
  tx: TxClient,
  bidId: string,
  reason: BidFeeRefundReason,
): Promise<RefundedBidInfo | null> {
  const bid = await tx.bid.findUnique({
    where: { id: bidId },
    select: {
      id: true,
      providerId: true,
      bidFeeAmount: true,
      bidFeeRefundedAt: true,
      provider: { select: { telegramChatId: true } },
      tender: { select: { id: true, title: true } },
    },
  });
  if (!bid) return null;
  if (bid.bidFeeRefundedAt) return null;

  const amount = Number(bid.bidFeeAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  await tx.user.update({
    where: { id: bid.providerId },
    data: { walletBalance: { increment: amount } },
  });

  await tx.transaction.create({
    data: {
      userId: bid.providerId,
      bidId: bid.id,
      type: "REFUND",
      status: "SUCCEEDED",
      amount,
      currency: "AMD",
      description: `${REASON_DESCRIPTION[reason]}՝ մուտքի վճարը վերադարձված է կրեդիտով · «${bid.tender.title.slice(0, 120)}»`,
    },
  });

  await tx.bid.update({
    where: { id: bid.id },
    data: {
      bidFeeRefundedAt: new Date(),
      bidFeeRefundedAmount: amount,
      bidFeeRefundReason: reason,
    },
  });

  return {
    bidId: bid.id,
    providerId: bid.providerId,
    amount,
    tenderTitle: bid.tender.title,
    tenderId: bid.tender.id,
    providerChatId: bid.provider.telegramChatId,
  };
}

export type { RefundedBidInfo };
