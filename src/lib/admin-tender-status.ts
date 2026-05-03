import type { Prisma, TenderStatus } from "@/generated/prisma/client";

export type TenderAdminStatusContext = {
  status: TenderStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Side-effect fields when an admin assigns a tender status. */
export function buildTenderAdminStatusData(
  prev: TenderAdminStatusContext,
  next: TenderStatus,
): Prisma.TenderUpdateInput {
  const now = new Date();
  const data: Prisma.TenderUpdateInput = { status: next };

  if (next === "ACTIVE") {
    const startsAt =
      prev.startsAt && prev.startsAt.getTime() <= now.getTime()
        ? prev.startsAt
        : now;
    data.startsAt = startsAt;

    const endsAt =
      prev.endsAt && prev.endsAt.getTime() > now.getTime()
        ? prev.endsAt
        : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    data.endsAt = endsAt;
  }

  if (next === "CANCELLED") {
    data.cancelledAt = now;
  } else if (prev.status === "CANCELLED") {
    data.cancelledAt = null;
  }

  if (next === "COMPLETED") {
    data.completedAt = now;
  } else if (prev.status === "COMPLETED") {
    data.completedAt = null;
  }

  return data;
}
