import type { TenderEscrowStatus } from "@/generated/prisma/client";

export type EscrowProgressPhase =
  | "contract"
  | "payment"
  | "confirm"
  | "work"
  | "done"
  | "dispute"
  | "cancelled";

export const ESCROW_PROGRESS_LABELS = [
  "Պայմանագիր",
  "Վճարում",
  "Հաստատում",
  "Աշխատանք",
] as const;

/**
 * Map escrow status to a 0–3 progress index for the 4-dot indicator.
 * dispute/cancelled return null (special UI).
 */
export function getEscrowProgressIndex(
  status: TenderEscrowStatus,
  contractAccepted: boolean,
): number | null {
  switch (status) {
    case "AWAITING_CONTRACT":
      return 0;
    case "PENDING_FUNDING":
      return contractAccepted ? 1 : 0;
    case "PAYMENT_SUBMITTED":
      return 2;
    case "FUNDED":
    case "RELEASE_PENDING":
      return 3;
    case "RELEASED":
    case "REFUNDED":
      return 3;
    case "DISPUTED":
    case "CANCELLED":
      return null;
    default:
      return 0;
  }
}

export function getEscrowProgressPhase(
  status: TenderEscrowStatus,
  contractAccepted: boolean,
): EscrowProgressPhase {
  if (status === "DISPUTED") return "dispute";
  if (status === "CANCELLED") return "cancelled";
  if (status === "RELEASED" || status === "REFUNDED") return "done";
  if (status === "FUNDED" || status === "RELEASE_PENDING") return "work";
  if (status === "PAYMENT_SUBMITTED") return "confirm";
  if (status === "PENDING_FUNDING" && contractAccepted) return "payment";
  return "contract";
}

export type EscrowRole = "client" | "provider";

/** Short headline for the current step card. */
export function getEscrowCurrentStepTitle(
  status: TenderEscrowStatus,
  role: EscrowRole,
  contractAccepted: boolean,
): string {
  if (!contractAccepted || status === "AWAITING_CONTRACT") {
    return "Սպասում ենք պայմանագրի հաստատմանը";
  }
  switch (status) {
    case "PENDING_FUNDING":
      return role === "client"
        ? "Կատարեք բանկային փոխանցումը"
        : "Սպասեք գումարի հաստատմանը";
    case "PAYMENT_SUBMITTED":
      return role === "client"
        ? "Սպասում ենք ադմինի ստուգմանը"
        : "Սպասեք· գումարը դեռ չի հաստատվել";
    case "FUNDED":
      return "Գումարը Tend.am-ում է պահված · կարող եք սկսել";
    case "RELEASE_PENDING":
      return "Սպասում ենք փոխանցմանը կատարողին";
    case "RELEASED":
      return "Գումարը փոխանցվել է կատարողին";
    case "REFUNDED":
      return "Գումարը վերադարձվել է պատվիրատուին";
    case "DISPUTED":
      return "Վեճի ընթացքում է";
    case "CANCELLED":
      return "Գործարքը չեղարկված է";
    default:
      return "Պաշտպանված գործարք";
  }
}
