import { prisma } from "@/lib/prisma";

export type AdminModerationCounts = {
  /** Verification requests waiting for admin */
  verifications: number;
  /** Tenders awaiting moderation before becoming ACTIVE */
  tenders: number;
  /** Bids awaiting moderation before reaching the client */
  bids: number;
  /** Reviews awaiting moderation before appearing publicly */
  reviews: number;
  /** Tender complaints from providers, status=PENDING */
  tenderComplaints: number;
  /** Blocked users — kept visible so admin can review/unblock */
  blockedUsers: number;
  /** New users in the last 7 days */
  newUsers7d: number;
};

export async function getAdminModerationCounts(): Promise<AdminModerationCounts> {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    verifications,
    tenders,
    bids,
    reviews,
    tenderComplaints,
    blockedUsers,
    newUsers7d,
  ] = await Promise.all([
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.tender.count({ where: { status: "REVIEW" } }),
    prisma.bid.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { moderationStatus: "PENDING" } }),
    prisma.tenderComplaint.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
  ]);

  return {
    verifications,
    tenders,
    bids,
    reviews,
    tenderComplaints,
    blockedUsers,
    newUsers7d,
  };
}
