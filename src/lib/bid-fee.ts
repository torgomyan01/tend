/**
 * Dynamic bid fee (AMD) charged to a provider when applying to a tender.
 *
 * Business goal:
 * - keep entry affordable for small jobs
 * - scale fee with budget size (and optionally category + urgency)
 * - keep pricing predictable (rounded to 100 AMD)
 */

export type BidFeeTier = {
  fee: number;
  label: string;
  range: string;
};

// Legacy tiers (mostly for UI copy / reference). Not used by computeBidFee anymore.
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
  category?: string | null;
  endsAt?: Date | string | null;
}): number {
  // 1) Budget component
  const min =
    typeof input.budgetMin === "number" && Number.isFinite(input.budgetMin)
      ? input.budgetMin
      : null;
  const max =
    typeof input.budgetMax === "number" && Number.isFinite(input.budgetMax)
      ? input.budgetMax
      : null;

  const reference =
    max !== null && min !== null
      ? (min + max) / 2
      : max ?? min ?? 0;

  const BASE_MIN = 500;
  const BASE_MAX = 5000;
  const RATE = 0.001; // 0.1% of budget reference

  const baseRaw =
    reference > 0 ? Math.max(BASE_MIN, Math.min(BASE_MAX, reference * RATE)) : BASE_MIN;

  // 2) Category multiplier (optional)
  const categoryKey = (input.category ?? "").trim().toLowerCase();
  const categoryMultiplier =
    CATEGORY_FEE_MULTIPLIER[categoryKey] ??
    // minimal keyword-based fallback (safe defaults)
    (categoryKey.includes("իրավ") ? 1.15 : 1.0);

  // 3) Urgency multiplier (optional, based on remaining time)
  const endsAtDate = parseDate(input.endsAt);
  const urgencyMultiplier = endsAtDate ? computeUrgencyMultiplier(endsAtDate) : 1.0;

  // 4) Final normalization (round to nearest 100 AMD)
  const fee = baseRaw * categoryMultiplier * urgencyMultiplier;
  return roundToStep(clamp(fee, BASE_MIN, BASE_MAX), 100);
}

export function describeBidFeeTier(fee: number): BidFeeTier {
  return (
    BID_FEE_TIERS.find((t) => t.fee === fee) ?? BID_FEE_TIERS[0]
  );
}

const CATEGORY_FEE_MULTIPLIER: Record<string, number> = {
  // Add exact matches as needed (admin-configurable later)
  // "շինարարություն և վերանորոգում": 1.05,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeUrgencyMultiplier(endsAt: Date): number {
  const remainingMs = endsAt.getTime() - Date.now();
  if (!Number.isFinite(remainingMs)) return 1.0;
  const remainingHours = remainingMs / (60 * 60 * 1000);
  if (remainingHours <= 0) return 1.0;
  if (remainingHours <= 24) return 1.5;
  if (remainingHours <= 72) return 1.25;
  if (remainingHours <= 168) return 1.1; // <= 7 days
  return 1.0;
}
