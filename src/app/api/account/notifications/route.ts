import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma, UserNotificationCategory } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import type { NotificationFilterTab } from "@/lib/notifications/in-app";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  filter: z
    .enum(["all", "unread", "APPROVED", "PENDING", "REJECTED", "INFO"])
    .optional()
    .default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
});

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  markAll: z.boolean().optional(),
  read: z.boolean().default(true),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    filter: searchParams.get("filter") ?? "all",
    limit: searchParams.get("limit") ?? "40",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }

  const { filter, limit } = parsed.data;
  const where: Prisma.UserNotificationWhereInput = {
    userId: session.user.id,
  };

  if (filter === "unread") {
    where.readAt = null;
  } else if (filter !== "all") {
    where.category = filter as UserNotificationCategory;
  }

  const [items, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        category: true,
        kind: true,
        title: true,
        body: true,
        href: true,
        tenderId: true,
        bidId: true,
        readAt: true,
        sentTelegram: true,
        sentEmail: true,
        createdAt: true,
      },
    }),
    prisma.userNotification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    items: items.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
      isRead: Boolean(n.readAt),
    })),
    unreadCount,
    filter: filter as NotificationFilterTab,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { ids, markAll, read } = parsed.data;

  if (!markAll && (!ids || ids.length === 0)) {
    return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
  }

  const where: Prisma.UserNotificationWhereInput = {
    userId: session.user.id,
  };

  if (!markAll && ids) {
    where.id = { in: ids };
  }

  const data = read
    ? { readAt: new Date() }
    : { readAt: null };

  const result = await prisma.userNotification.updateMany({
    where,
    data,
  });

  const unreadCount = await prisma.userNotification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return NextResponse.json({ updated: result.count, unreadCount });
}
