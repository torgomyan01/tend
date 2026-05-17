import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { conversationNeedsStaffReply } from "@/lib/support-chat";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const conversations = await prisma.supportConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          sender: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  const items = conversations.map((c) => {
    const last = c.messages[0];
    const needsReply = conversationNeedsStaffReply(c.staffLastReadAt, last);
    return {
      id: c.id,
      userId: c.userId,
      user: c.user,
      lastMessageAt: c.lastMessageAt.toISOString(),
      staffLastReadAt: c.staffLastReadAt?.toISOString() ?? null,
      needsReply,
      lastMessage: last
        ? {
            id: last.id,
            sender: last.sender,
            body: last.body,
            createdAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  const needsReplyCount = items.filter((i) => i.needsReply).length;

  return NextResponse.json({ items, needsReplyCount });
}
