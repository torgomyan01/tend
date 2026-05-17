import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const supportMessageInclude = {
  attachments: {
    select: {
      id: true,
      url: true,
      originalFileName: true,
      mimeType: true,
      sizeBytes: true,
    },
  },
  senderUser: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.SupportMessageInclude;

export async function getOrCreateSupportConversation(userId: string) {
  const existing = await prisma.supportConversation.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  return prisma.supportConversation.create({
    data: { userId },
  });
}

export function serializeSupportMessage(
  message: Prisma.SupportMessageGetPayload<{
    include: typeof supportMessageInclude;
  }>,
) {
  return {
    id: message.id,
    sender: message.sender,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    attachments: message.attachments,
    staff: message.senderUser
      ? {
          id: message.senderUser.id,
          name: message.senderUser.name,
          role: message.senderUser.role,
        }
      : null,
  };
}

/** Staff-ի համար չկարդացված զրույցներ */
export async function countSupportConversationsNeedingStaff() {
  const conversations = await prisma.supportConversation.findMany({
    select: {
      id: true,
      staffLastReadAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { sender: true, createdAt: true },
      },
    },
  });

  let count = 0;
  for (const c of conversations) {
    const last = c.messages[0];
    if (!last || last.sender !== "USER") continue;
    if (!c.staffLastReadAt || last.createdAt > c.staffLastReadAt) {
      count += 1;
    }
  }
  return count;
}

export function conversationNeedsStaffReply(
  staffLastReadAt: Date | null,
  lastMessage: { sender: string; createdAt: Date } | undefined,
) {
  if (!lastMessage || lastMessage.sender !== "USER") {
    return false;
  }
  if (!staffLastReadAt) {
    return true;
  }
  return lastMessage.createdAt > staffLastReadAt;
}
