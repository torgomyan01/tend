import { prisma } from "@/lib/prisma";
import { tenderOpenForBidsWhere } from "@/lib/tender-open-for-bids";

export type HomeStats = {
  activeTenders: number;
  completedTenders: number;
  totalBids: number;
  providers: number;
};

/**
 * Lightweight aggregate counts shown on the landing page.
 * Falls back to zero values if any single query fails, so the
 * landing page never breaks on a transient DB issue.
 */
export async function getHomeStats(): Promise<HomeStats> {
  try {
    const [activeTenders, completedTenders, totalBids, providers] =
      await Promise.all([
        prisma.tender.count({ where: tenderOpenForBidsWhere() }),
        prisma.tender.count({
          where: { status: { in: ["COMPLETED", "AWARDED"] } },
        }),
        prisma.bid.count(),
        prisma.user.count({ where: { bids: { some: {} } } }),
      ]);

    return { activeTenders, completedTenders, totalBids, providers };
  } catch {
    return { activeTenders: 0, completedTenders: 0, totalBids: 0, providers: 0 };
  }
}
