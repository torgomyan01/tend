import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyExpiredUnawardedPenalty } from "@/lib/expired-unawarded-notify";

export const EXPIRED_UNAWARDED_MIN_BIDS = 3;
const GRACE_MS = 24 * 60 * 60 * 1000;

export const PLATFORM_PENALTY_REVIEW_COMMENT =
  "Կատարվել են գործողություններ, որոնք չեն համապատասխանում Tend.am կայքի պայմաններին և օգտագործման կանոններին։ Մրցույթի ավարտից հետո (առնվազն 3 դիմողի դեպքում) կատարող չի ընտրվել, ինչի հետևանքով դիմողների մուտքային վճարները չեն արդարացվել։";

const paidBidWhere: Prisma.BidWhereInput = {
  status: { not: "WITHDRAWN" },
  bidFeeRefundedAt: null,
};

export type EligibleExpiredTender = {
  id: string;
  title: string;
  endsAt: Date | null;
  clientId: string;
  client: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  paidBidCount: number;
};

export type RepeatOffenderRow = {
  clientId: string;
  name: string | null;
  email: string;
  phone: string | null;
  violationCount: number;
  tenderIds: string[];
};

export type ExpiredUnawardedProcessResult = {
  scanned: number;
  processed: Array<{ tenderId: string; title: string; clientId: string }>;
  skipped: Array<{ tenderId: string; reason: string }>;
};

async function resolvePlatformReviewerId(fallbackAdminId: string): Promise<string> {
  const fromEnv = process.env.PLATFORM_REVIEWER_USER_ID?.trim();
  if (fromEnv) {
    const u = await prisma.user.findUnique({
      where: { id: fromEnv },
      select: { id: true },
    });
    if (u) return u.id;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isBlocked: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return admin?.id ?? fallbackAdminId;
}

export async function findEligibleExpiredUnawardedTenders(): Promise<
  EligibleExpiredTender[]
> {
  const endsBefore = new Date(Date.now() - GRACE_MS);

  const tenders = await prisma.tender.findMany({
    where: {
      status: "ACTIVE",
      endsAt: { lt: endsBefore },
      awardedBidId: null,
    },
    select: {
      id: true,
      title: true,
      endsAt: true,
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      bids: {
        where: paidBidWhere,
        select: { id: true },
      },
    },
    orderBy: { endsAt: "asc" },
  });

  return tenders
    .filter((t) => t.bids.length >= EXPIRED_UNAWARDED_MIN_BIDS)
    .map((t) => ({
      id: t.id,
      title: t.title,
      endsAt: t.endsAt,
      clientId: t.clientId,
      client: t.client,
      paidBidCount: t.bids.length,
    }));
}

export async function getRepeatOffenderPublishers(): Promise<RepeatOffenderRow[]> {
  const tenders = await prisma.tender.findMany({
    where: { status: "EXPIRED_UNAWARDED" },
    select: {
      id: true,
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const byClient = new Map<
    string,
    { client: RepeatOffenderRow; tenderIds: string[] }
  >();

  for (const t of tenders) {
    const existing = byClient.get(t.clientId);
    if (existing) {
      existing.tenderIds.push(t.id);
      existing.client.violationCount += 1;
    } else {
      byClient.set(t.clientId, {
        client: {
          clientId: t.clientId,
          name: t.client.name,
          email: t.client.email,
          phone: t.client.phone,
          violationCount: 1,
          tenderIds: [t.id],
        },
        tenderIds: [t.id],
      });
    }
  }

  return [...byClient.values()]
    .map((v) => ({
      ...v.client,
      tenderIds: v.tenderIds,
    }))
    .filter((r) => r.violationCount >= 2)
    .sort((a, b) => b.violationCount - a.violationCount);
}

export async function runExpiredUnawardedCheck(
  adminUserId: string,
): Promise<ExpiredUnawardedProcessResult> {
  const eligible = await findEligibleExpiredUnawardedTenders();
  const reviewerId = await resolvePlatformReviewerId(adminUserId);

  const processed: ExpiredUnawardedProcessResult["processed"] = [];
  const skipped: ExpiredUnawardedProcessResult["skipped"] = [];

  for (const tender of eligible) {
    const existingPenalty = await prisma.review.findFirst({
      where: { tenderId: tender.id, isPlatformPenalty: true },
      select: { id: true },
    });

    if (existingPenalty) {
      skipped.push({ tenderId: tender.id, reason: "ALREADY_PENALIZED" });
      continue;
    }

    const alreadyExpired = await prisma.tender.findUnique({
      where: { id: tender.id },
      select: { status: true },
    });

    if (alreadyExpired?.status === "EXPIRED_UNAWARDED") {
      skipped.push({ tenderId: tender.id, reason: "ALREADY_EXPIRED" });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.tender.update({
        where: { id: tender.id },
        data: { status: "EXPIRED_UNAWARDED" },
      });

      await tx.review.create({
        data: {
          tenderId: tender.id,
          reviewerId,
          revieweeId: tender.clientId,
          rating: 1,
          comment: PLATFORM_PENALTY_REVIEW_COMMENT,
          isPlatformPenalty: true,
          moderationStatus: "APPROVED",
          moderatedAt: new Date(),
        },
      });
    });

    await notifyExpiredUnawardedPenalty({
      userId: tender.clientId,
      tenderId: tender.id,
      tenderTitle: tender.title,
      paidBidCount: tender.paidBidCount,
    }).catch(() => undefined);

    processed.push({
      tenderId: tender.id,
      title: tender.title,
      clientId: tender.clientId,
    });
  }

  return {
    scanned: eligible.length,
    processed,
    skipped,
  };
}
