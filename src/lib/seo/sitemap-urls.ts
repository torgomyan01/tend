import type { MetadataRoute } from "next";
import { resolvePublicAppOrigin } from "@/lib/absolute-app-url";
import { ROUTES } from "@/lib/routes";
import { prisma } from "@/lib/prisma";

const SITEMAP_MAX_TENDERS = 10_000;
const SITEMAP_MAX_USERS = 10_000;

function entry(
  path: string,
  opts: {
    lastModified?: Date;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
  } = {},
): MetadataRoute.Sitemap[number] {
  const base = resolvePublicAppOrigin().replace(/\/$/, "");
  return {
    url: `${base}${path.startsWith("/") ? path : `/${path}`}`,
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
  };
}

/** Ստատիկ հանրային էջեր */
function staticPublicEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    entry(ROUTES.home, {
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    }),
    entry(ROUTES.tenders, {
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    }),
    entry(ROUTES.categories, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }),
    entry(ROUTES.howItWorks, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
    entry(ROUTES.sections.providers, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
    entry(ROUTES.terms, {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
    }),
    entry(ROUTES.privacy, {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
    }),
  ];
}

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [categories, tenders, users] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tender.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: SITEMAP_MAX_TENDERS,
    }),
    prisma.user.findMany({
      where: {
        isBlocked: false,
        OR: [
          { bids: { some: {} } },
          {
            reviewsReceived: {
              some: { moderationStatus: "APPROVED" },
            },
          },
          {
            tenders: {
              some: {
                status: { in: ["ACTIVE", "AWARDED", "COMPLETED"] },
              },
            },
          },
        ],
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: SITEMAP_MAX_USERS,
    }),
  ]);

  const categoryEntries = categories.map((c) =>
    entry(ROUTES.categoryDetail(c.id), {
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.75,
    }),
  );

  const tenderEntries = tenders.map((t) =>
    entry(ROUTES.tenderDetail(t.id), {
      lastModified: t.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }),
  );

  const userEntries = users.map((u) =>
    entry(ROUTES.userProfile(u.id), {
      lastModified: u.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  return [
    ...staticPublicEntries(),
    ...categoryEntries,
    ...tenderEntries,
    ...userEntries,
  ];
}
