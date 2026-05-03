/**
 * Bid fee tiers (in AMD) charged to a provider when applying to a tender.
 *
 * Business rule:
 *   - tender budget up to 100,000 ֏           → 500 ֏
 *   - tender budget 100,001 – 1,000,000 ֏     → 1,000 ֏
 *   - tender budget above 1,000,000 ֏          → 2,000 ֏
 *
 * The "tender budget" is the upper bound (`budgetMax`) when set;
 * otherwise we fall back to `budgetMin`, otherwise the lowest tier.
 */

export type BidFeeTier = {
  fee: number;
  label: string;
  range: string;
};

export const BID_FEE_TIERS: readonly BidFeeTier[] = [
  {
    fee: 500,
    label: "Փոքր մրցույթներ",
    range: "Մինչև 100,000 ֏",
  },
  {
    fee: 1000,
    label: "Միջին մրցույթներ",
    range: "100,000 – 1,000,000 ֏",
  },
  {
    fee: 2000,
    label: "Խոշոր մրցույթներ",
    range: "1,000,000 ֏-ից բարձր",
  },
] as const;

export function computeBidFee(input: {
  budgetMin: number | null;
  budgetMax: number | null;
}): number {
  const reference = input.budgetMax ?? input.budgetMin ?? 0;
  if (reference <= 100_000) return 500;
  if (reference <= 1_000_000) return 1000;
  return 2000;
}

export function describeBidFeeTier(fee: number): BidFeeTier {
  return (
    BID_FEE_TIERS.find((t) => t.fee === fee) ?? BID_FEE_TIERS[0]
  );
}
