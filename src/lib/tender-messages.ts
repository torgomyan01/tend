import type { Prisma } from "@/generated/prisma/client";
import { ROUTES } from "@/lib/routes";

export const tenderMessageInclude = {
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
    select: { id: true, name: true, email: true, image: true },
  },
} satisfies Prisma.TenderMessageInclude;

export type TenderMessageWithRelations = Prisma.TenderMessageGetPayload<{
  include: typeof tenderMessageInclude;
}>;

export function serializeTenderMessage(message: TenderMessageWithRelations) {
  return {
    id: message.id,
    kind: message.kind,
    body: message.body,
    contractId: message.contractId,
    contractHref: message.contractId
      ? ROUTES.contract(message.contractId)
      : null,
    createdAt: message.createdAt.toISOString(),
    senderUserId: message.senderUserId,
    sender: message.senderUser
      ? {
          id: message.senderUser.id,
          name:
            message.senderUser.name?.trim() ||
            message.senderUser.email ||
            "Օգտատեր",
          image: message.senderUser.image,
        }
      : null,
    attachments: message.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      originalFileName: a.originalFileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  };
}

export function participantRole(
  userId: string,
  conversation: { clientId: string; providerId: string },
): "client" | "provider" | null {
  if (userId === conversation.clientId) return "client";
  if (userId === conversation.providerId) return "provider";
  return null;
}

export function lastReadAtFor(
  role: "client" | "provider",
  conversation: {
    clientLastReadAt: Date | null;
    providerLastReadAt: Date | null;
  },
) {
  return role === "client"
    ? conversation.clientLastReadAt
    : conversation.providerLastReadAt;
}

export function displayName(user: {
  name: string | null;
  email: string;
}): string {
  return user.name?.trim() || user.email || "Օգտատեր";
}
