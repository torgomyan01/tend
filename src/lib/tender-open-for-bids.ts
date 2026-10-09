import type { Prisma } from "@/generated/prisma/client";

/** Contract statuses that mean a performer is already selected. */
export const TENDER_BLOCKING_CONTRACT_STATUSES = [
  "PENDING_CLIENT",
  "PENDING_PROVIDER",
  "ACCEPTED",
] as const;

/**
 * Public catalog / search: only tenders still open for new applications.
 * Once a performer is chosen (pending/accepted contract or awardedBid),
 * the tender stays ACTIVE until both sides sign — but must not appear in browse.
 */
export function tenderOpenForBidsWhere(
  now: Date = new Date(),
): Prisma.TenderWhereInput {
  return {
    status: "ACTIVE",
    awardedBidId: null,
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    contracts: {
      none: {
        status: {
          in: [...TENDER_BLOCKING_CONTRACT_STATUSES],
        },
      },
    },
  };
}

/** Runtime check for apply page / detail CTA / bid API. */
export function isTenderOpenForBids(params: {
  status: string;
  awardedBidId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasBlockingContract: boolean;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  if (params.status !== "ACTIVE") return false;
  if (params.awardedBidId) return false;
  if (params.hasBlockingContract) return false;
  if (params.endsAt && params.endsAt <= now) return false;
  if (params.startsAt && params.startsAt > now) return false;
  return true;
}
