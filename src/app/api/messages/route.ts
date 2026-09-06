import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  displayName,
  lastReadAtFor,
  participantRole,
} from "@/lib/tender-messages";

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
    },
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      archivedAt: true,
      lastMessageAt: true,
      clientLastReadAt: true,
      providerLastReadAt: true,
      clientId: true,
      providerId: true,
      contractId: true,
      tender: { select: { id: true, title: true } },
      client: { select: { id: true, name: true, email: true, image: true } },
      provider: { select: { id: true, name: true, email: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          kind: true,
          createdAt: true,
          senderUserId: true,
        },
      },
    },
  });

  const items = await Promise.all(
    conversations.map(async (c) => {
      const role = participantRole(userId, c);
      if (!role) return null;

      const peer = role === "client" ? c.provider : c.client;
      const lastRead = lastReadAtFor(role, c);
      const last = c.messages[0] ?? null;

      const unreadCount = await prisma.tenderMessage.count({
        where: {
          conversationId: c.id,
          NOT: { senderUserId: userId },
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      });

      return {
        id: c.id,
        status: c.status,
        archivedAt: c.archivedAt?.toISOString() ?? null,
        lastMessageAt: c.lastMessageAt.toISOString(),
        tender: c.tender,
        contractId: c.contractId,
        peer: {
          id: peer.id,
          name: displayName(peer),
          image: peer.image,
        },
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              kind: last.kind,
              createdAt: last.createdAt.toISOString(),
              senderUserId: last.senderUserId,
            }
          : null,
        unreadCount,
      };
    }),
  );

  const sorted = items
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "ACTIVE" ? -1 : 1;
      }
      return (
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
      );
    });

  return NextResponse.json({ conversations: sorted });
}
