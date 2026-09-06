import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastReadAtFor, participantRole } from "@/lib/tender-messages";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.tenderConversation.findMany({
    where: {
      OR: [{ clientId: userId }, { providerId: userId }],
      status: "ACTIVE",
    },
    select: {
      id: true,
      clientId: true,
      providerId: true,
      clientLastReadAt: true,
      providerLastReadAt: true,
    },
  });

  let unread = 0;
  for (const c of conversations) {
    const role = participantRole(userId, c);
    if (!role) continue;
    const lastRead = lastReadAtFor(role, c);
    const count = await prisma.tenderMessage.count({
      where: {
        conversationId: c.id,
        NOT: { senderUserId: userId },
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    });
    unread += count;
  }

  return NextResponse.json({ unreadCount: unread });
}
