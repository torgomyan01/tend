import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calcEscrowPricing, type EscrowPricing } from "@/lib/escrow";
import type { TenderEscrowStatus } from "@/generated/prisma/client";

function generateEscrowPaymentCode(): string {
  const token = randomBytes(4).toString("hex").toUpperCase();
  return `TEND-ESC-${token}`;
}

export const ESCROW_OPEN_STATUSES: TenderEscrowStatus[] = [
  "AWAITING_CONTRACT",
  "PENDING_FUNDING",
  "PAYMENT_SUBMITTED",
  "FUNDED",
  "DISPUTED",
  "RELEASE_PENDING",
];

/** Կանխում է կատարողի հանումը, երբ գումարը արդեն շրջանառության մեջ է */
export const ESCROW_BLOCK_UNAWARD_STATUSES: TenderEscrowStatus[] = [
  "PAYMENT_SUBMITTED",
  "FUNDED",
  "DISPUTED",
  "RELEASE_PENDING",
  "RELEASED",
];

export function serializeEscrow(escrow: {
  id: string;
  status: TenderEscrowStatus;
  paymentCode: string;
  contractAmount: { toString(): string } | number;
  platformFeePercent: { toString(): string } | number;
  platformFeeAmount: { toString(): string } | number;
  providerReceives: { toString(): string } | number;
  currency: string;
  clientReceiptUrl: string | null;
  clientNote: string | null;
  fundedAt: Date | null;
  releaseRequestedAt: Date | null;
  releasedAt: Date | null;
  disputedAt: Date | null;
  disputeReason: string | null;
  refundedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: escrow.id,
    status: escrow.status,
    paymentCode: escrow.paymentCode,
    contractAmount: Number(escrow.contractAmount),
    platformFeePercent: Number(escrow.platformFeePercent),
    platformFeeAmount: Number(escrow.platformFeeAmount),
    providerReceives: Number(escrow.providerReceives),
    currency: escrow.currency,
    clientReceiptUrl: escrow.clientReceiptUrl,
    clientNote: escrow.clientNote,
    fundedAt: escrow.fundedAt?.toISOString() ?? null,
    releaseRequestedAt: escrow.releaseRequestedAt?.toISOString() ?? null,
    releasedAt: escrow.releasedAt?.toISOString() ?? null,
    disputedAt: escrow.disputedAt?.toISOString() ?? null,
    disputeReason: escrow.disputeReason,
    refundedAt: escrow.refundedAt?.toISOString() ?? null,
    cancelledAt: escrow.cancelledAt?.toISOString() ?? null,
    createdAt: escrow.createdAt.toISOString(),
  };
}

export type SerializedEscrow = ReturnType<typeof serializeEscrow>;

export async function createTenderEscrow(params: {
  tenderId: string;
  contractId: string;
  clientId: string;
  providerId: string;
  contractAmount: number;
}) {
  const pricing: EscrowPricing = calcEscrowPricing(params.contractAmount);
  let paymentCode = generateEscrowPaymentCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.tenderEscrow.create({
        data: {
          tenderId: params.tenderId,
          contractId: params.contractId,
          clientId: params.clientId,
          providerId: params.providerId,
          status: "AWAITING_CONTRACT",
          paymentCode,
          contractAmount: pricing.contractAmount,
          platformFeePercent: pricing.platformFeePercent,
          platformFeeAmount: pricing.platformFeeAmount,
          providerReceives: pricing.providerReceives,
          currency: "AMD",
        },
      });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "P2002") {
        paymentCode = generateEscrowPaymentCode();
        continue;
      }
      throw err;
    }
  }

  throw new Error("ESCROW_PAYMENT_CODE_COLLISION");
}

export async function cancelEscrowForContract(
  contractId: string,
  opts?: { onlyIfStatuses?: TenderEscrowStatus[] },
) {
  const escrow = await prisma.tenderEscrow.findUnique({
    where: { contractId },
    select: { id: true, status: true },
  });
  if (!escrow) return null;

  const allowed = opts?.onlyIfStatuses ?? [
    "AWAITING_CONTRACT",
    "PENDING_FUNDING",
  ];
  if (!allowed.includes(escrow.status)) return escrow;

  return prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

export async function cancelEscrowsForTender(
  tenderId: string,
  opts?: { onlyIfStatuses?: TenderEscrowStatus[] },
) {
  const allowed = opts?.onlyIfStatuses ?? [
    "AWAITING_CONTRACT",
    "PENDING_FUNDING",
  ];
  await prisma.tenderEscrow.updateMany({
    where: {
      tenderId,
      status: { in: allowed },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

export async function findBlockingEscrowForTender(tenderId: string) {
  return prisma.tenderEscrow.findFirst({
    where: {
      tenderId,
      status: { in: ESCROW_BLOCK_UNAWARD_STATUSES },
    },
    select: { id: true, status: true, paymentCode: true },
  });
}
