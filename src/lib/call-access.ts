import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { participantRole } from "@/lib/tender-messages";

export async function requireCallParticipant(callId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };
  }

  const call = await prisma.callSession.findUnique({
    where: { id: callId },
    include: {
      conversation: {
        select: {
          id: true,
          clientId: true,
          providerId: true,
          status: true,
          tenderId: true,
          tender: { select: { id: true, title: true } },
        },
      },
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!call) {
    return { error: Response.json({ error: "NOT_FOUND" }, { status: 404 }) };
  }

  const userId = session.user.id;
  if (userId !== call.callerId && userId !== call.calleeId) {
    return { error: Response.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { userId, call, session };
}

export async function requireConversationParty(conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };
  }

  const conversation = await prisma.tenderConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      clientId: true,
      providerId: true,
      status: true,
      tenderId: true,
      tender: { select: { id: true, title: true } },
      client: { select: { id: true, name: true, email: true, image: true } },
      provider: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!conversation) {
    return { error: Response.json({ error: "NOT_FOUND" }, { status: 404 }) };
  }

  const role = participantRole(session.user.id, conversation);
  if (!role) {
    return { error: Response.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { userId: session.user.id, conversation, role, session };
}
