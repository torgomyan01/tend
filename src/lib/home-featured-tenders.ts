import { prisma } from "@/lib/prisma";

export type FeaturedHomeTender = {
  id: string;
  title: string;
  endsAtIso: string | null;
  initialRemainingMs: number | null;
  tags: string[];
  bidCount: number;
  bidderBadges: string[];
  notes: string[];
};

function remainingMsUntil(endsAt: Date | null): number | null {
  if (!endsAt) return null;
  const ms = endsAt.getTime() - Date.now();
  return Number.isFinite(ms) ? ms : null;
}

function initialLetter(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

export async function getFeaturedHomeTenders(
  limit = 5,
): Promise<FeaturedHomeTender[]> {
  const now = new Date();
  const rows = await prisma.tender.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      service: true,
      city: true,
      endsAt: true,
      isBlindBidding: true,
      selectedServices: {
        orderBy: { sortOrder: "asc" },
        take: 6,
        select: { service: true },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 16,
        select: {
          providerId: true,
          provider: { select: { name: true } },
        },
      },
      _count: { select: { bids: true } },
    },
  });

  return rows.map((row) => {
    const endsAtIso = row.endsAt?.toISOString() ?? null;
    const initialRemainingMs =
      row.endsAt != null ? remainingMsUntil(row.endsAt) : null;

    const tags: string[] = [];
    const seenTag = new Set<string>();
    const pushTag = (raw: string) => {
      const s = raw.trim();
      if (!s || seenTag.has(s)) return;
      seenTag.add(s);
      tags.push(s);
    };
    pushTag(row.category);
    pushTag(row.service);
    for (const ss of row.selectedServices) {
      if (tags.length >= 3) break;
      pushTag(ss.service);
    }

    const bidCount = row._count.bids;
    const providerSeen = new Set<string>();
    const bidderBadges: string[] = [];
    for (const b of row.bids) {
      if (bidderBadges.length >= 3) break;
      if (providerSeen.has(b.providerId)) continue;
      providerSeen.add(b.providerId);
      bidderBadges.push(initialLetter(b.provider.name));
    }
    if (bidCount > 3) {
      bidderBadges.push(`+${bidCount - 3}`);
    }

    const notes: string[] = [];
    notes.push(
      row.isBlindBidding
        ? "Առաջարկները փակ են մինչև վերջնաժամկետը կամ պատվիրատուի ընտրությունը։"
        : "Այս մրցույթում առաջարկների գները տեսանելի են մասնագետների համար։",
    );
    if (row.city?.trim()) {
      notes.push(`Տեղ՝ ${row.city.trim()}։`);
    }
    notes.push(
      bidCount === 0
        ? "Դեռ առաջարկներ չկան՝ կարող եք լինել առաջինը։"
        : `${bidCount} առաջարկ է ուղարկվել։`,
    );

    return {
      id: row.id,
      title: row.title,
      endsAtIso,
      initialRemainingMs,
      tags,
      bidCount,
      bidderBadges,
      notes,
    };
  });
}
