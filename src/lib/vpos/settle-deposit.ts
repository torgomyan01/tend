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
 * Credits the wallet at most once for a PENDING deposit.
 * Relies on atomic `updateMany(... status: PENDING → SUCCEEDED)` so concurrent
 * confirm/reconcile/StrictMode calls cannot double-increment.
 */
async function creditPendingDepositOnce(input: {
  transactionId: string;
  userId: string;
  amount: number;
}): Promise<{ credited: boolean; balance: number }> {
  const credited = await prisma.$transaction(async (tx) => {
    const claimed = await tx.transaction.updateMany({
      where: { id: input.transactionId, status: "PENDING" },
      data: {
        status: "SUCCEEDED",
        description: "Դրամապանակի լիցքավորում (VPOS)",
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { walletBalance: { increment: input.amount } },
    });

    return true;
  });

  return {
    credited,
    balance: await currentBalance(input.userId),
  };
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

  const isStale =
    Date.now() - existing.createdAt.getTime() > ABANDON_AFTER_MS;

  const listRes = await vposTransactionsList({ orderID: input.orderNumber });
  const item = listRes.body?.data?.list?.[0];
  const authState = item ? vposAuthState(item) : "pending";

  if (!item || authState === "pending") {
    if (isStale) {
      await prisma.transaction.updateMany({
        where: { id: existing.id, status: "PENDING" },
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
    await prisma.transaction.updateMany({
      where: { id: existing.id, status: "PENDING" },
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

  // Two-phase merchant: capture hold before wallet credit.
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

  const { balance } = await creditPendingDepositOnce({
    transactionId: existing.id,
    userId: input.userId,
    amount,
  });

  return { status: "SUCCEEDED", balance, amount };
}

/**
 * Self-healing: settles deposits whose payment finished but whose browser never
 * returned to the callback page. Safe to call often — credit is atomic.
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
    orderBy: { createdAt: "asc" },
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
