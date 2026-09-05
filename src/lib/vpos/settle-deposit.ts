import { prisma } from "@/lib/prisma";
import {
  isVposCaptureSettled,
  vposAuthState,
  vposConfirmPayment,
  vposNeedsCapture,
  vposTransactionsList,
} from "@/lib/vpos/client";
import { VPOS_GATEWAY } from "@/lib/vpos/config";

/** How long an unfinished checkout stays eligible for settlement. */
const ABANDON_AFTER_MS = 60 * 60 * 1000;

export type SettleDepositResult =
  | { status: "SUCCEEDED"; balance: number; amount: number }
  | { status: "PENDING"; amount: number }
  | { status: "FAILED"; amount: number; reason?: string }
  | { status: "NOT_FOUND" }
  | { status: "FORBIDDEN" };

async function currentBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  return Number(user?.walletBalance ?? 0);
}

/**
 * Checks the VPOS order, captures held funds when the merchant account runs in
 * two-phase mode, then credits the wallet exactly once.
 */
export async function settleVposDeposit(input: {
  userId: string;
  orderNumber: number;
}): Promise<SettleDepositResult> {
  const existing = await prisma.transaction.findFirst({
    where: {
      orderNumber: input.orderNumber,
      type: "DEPOSIT",
      gateway: VPOS_GATEWAY,
    },
    select: {
      id: true,
      userId: true,
      status: true,
      amount: true,
      createdAt: true,
    },
  });

  if (!existing) {
    return { status: "NOT_FOUND" };
  }

  if (existing.userId !== input.userId) {
    return { status: "FORBIDDEN" };
  }

  const amount = Number(existing.amount);

  if (existing.status === "SUCCEEDED") {
    return {
      status: "SUCCEEDED",
      balance: await currentBalance(input.userId),
      amount,
    };
  }

  if (existing.status === "FAILED" || existing.status === "CANCELLED") {
    return { status: "FAILED", amount };
  }

  /** Abandoned checkouts are given up on so they stop being re-polled. */
  const isStale =
    Date.now() - existing.createdAt.getTime() > ABANDON_AFTER_MS;

  const listRes = await vposTransactionsList({ orderID: input.orderNumber });
  const item = listRes.body?.data?.list?.[0];
  const authState = item ? vposAuthState(item) : "pending";

  if (!item || authState === "pending") {
    if (isStale) {
      await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          description: "VPOS վճարումը չի ավարտվել",
        },
      });
      return { status: "FAILED", amount, reason: "Վճարումը չի ավարտվել" };
    }
    return { status: "PENDING", amount };
  }

  if (authState === "declined") {
    await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        status: "FAILED",
        description: item.response?.Description ?? "VPOS վճարումը մերժվել է",
      },
    });
    return {
      status: "FAILED",
      amount,
      reason: item.response?.Description,
    };
  }

  // Authorized. In two-phase mode the money is only held, so capture it before
  // crediting the wallet — the deposit must debit the card immediately.
  if (vposNeedsCapture(item)) {
    const captureRes = await vposConfirmPayment({
      orderID: input.orderNumber,
      customerID: input.userId,
      amount,
    });

    if (!isVposCaptureSettled(captureRes)) {
      console.error(
        "[settleVposDeposit] capture failed",
        input.orderNumber,
        captureRes.raw,
      );
      return { status: "PENDING", amount };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.transaction.findUnique({
      where: { id: existing.id },
      select: { id: true, status: true, amount: true },
    });

    if (!row || row.status !== "PENDING") {
      return null;
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { walletBalance: { increment: row.amount } },
    });

    await tx.transaction.update({
      where: { id: row.id },
      data: {
        status: "SUCCEEDED",
        description: "Դրամապանակի լիցքավորում (VPOS)",
      },
    });

    return { amount: Number(row.amount) };
  });

  return {
    status: "SUCCEEDED",
    balance: await currentBalance(input.userId),
    amount: result?.amount ?? amount,
  };
}

/**
 * Self-healing: settles deposits whose payment finished but whose browser never
 * returned to the callback page.
 */
export async function reconcilePendingVposDeposits(userId: string) {
  const cutoff = new Date(Date.now() - 2 * ABANDON_AFTER_MS);

  const pending = await prisma.transaction.findMany({
    where: {
      userId,
      type: "DEPOSIT",
      gateway: VPOS_GATEWAY,
      status: "PENDING",
      createdAt: { gte: cutoff },
      orderNumber: { not: null },
    },
    select: { orderNumber: true },
    take: 10,
  });

  for (const row of pending) {
    if (row.orderNumber == null) continue;
    try {
      await settleVposDeposit({ userId, orderNumber: row.orderNumber });
    } catch (error) {
      console.error("[reconcilePendingVposDeposits]", row.orderNumber, error);
    }
  }
}
