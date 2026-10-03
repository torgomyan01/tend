/** Լռելյայն հարթակի միջնորդավճար (%)՝ հանվում է կատարողից բարեհաջող ավարտից հետո */
export const DEFAULT_ESCROW_FEE_PERCENT = 1;

export type EscrowPricing = {
  contractAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerReceives: number;
  clientPays: number;
};

export function getEscrowFeePercent(): number {
  const raw = process.env.ESCROW_PLATFORM_FEE_PERCENT?.trim();
  if (!raw) return DEFAULT_ESCROW_FEE_PERCENT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return DEFAULT_ESCROW_FEE_PERCENT;
  return Math.round(n * 100) / 100;
}

export function calcEscrowPricing(contractAmount: number): EscrowPricing {
  const amount = Math.max(0, Math.round(contractAmount));
  const platformFeePercent = getEscrowFeePercent();
  const platformFeeAmount = Math.round((amount * platformFeePercent) / 100);
  const providerReceives = Math.max(0, amount - platformFeeAmount);
  return {
    contractAmount: amount,
    platformFeePercent,
    platformFeeAmount,
    providerReceives,
    clientPays: amount,
  };
}

export type EscrowBankDetails = {
  receiverName: string;
  bankName: string;
  accountNumber: string;
  hint: string | null;
};

export function getEscrowBankDetails(): EscrowBankDetails {
  return {
    receiverName:
      process.env.ESCROW_BANK_RECEIVER?.trim() || "Tend.am / TorgomyanStudio",
    bankName: process.env.ESCROW_BANK_NAME?.trim() || "Հայաստանի բանկ",
    accountNumber:
      process.env.ESCROW_BANK_ACCOUNT?.trim() || "0000000000000000",
    hint: process.env.ESCROW_BANK_HINT?.trim() || null,
  };
}

export const ESCROW_STATUS_LABEL: Record<string, string> = {
  AWAITING_CONTRACT: "Սպասում է պայմանագրի հաստատմանը",
  PENDING_FUNDING: "Սպասում ենք փոխանցմանը",
  PAYMENT_SUBMITTED: "Ստուգում ենք մուտքը",
  FUNDED: "Գումարը պահված է · կարող եք սկսել",
  DISPUTED: "Վեճի ընթացքում",
  RELEASE_PENDING: "Հաստատված է · սպասում է փոխանցմանը կատարողին",
  RELEASED: "Գումարը փոխանցվել է կատարողին",
  REFUNDED: "Գումարը վերադարձվել է պատվիրատուին",
  CANCELLED: "Չեղարկված է",
};
