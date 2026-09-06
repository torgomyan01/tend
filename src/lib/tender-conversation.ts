import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export async function createTenderConversationWithContractMessage(params: {
  tenderId: string;
  clientId: string;
  providerId: string;
  contractId: string;
  tenderTitle: string;
}) {
  const contractPath = ROUTES.contract(params.contractId);
  const body = [
    `Պայմանագրի առաջարկ՝ «${params.tenderTitle}»`,
    ``,
    `Պատվիրատուն ձեզ ընտրել է որպես կատարող։ Երկու կողմն էլ պետք է հաստատեն էլեկտրոնային պայմանագիրը։`,
    ``,
    `Բացեք պայմանագիրը՝ ${contractPath}`,
  ].join("\n");

  const now = new Date();

  const conversation = await prisma.tenderConversation.create({
    data: {
      tenderId: params.tenderId,
      clientId: params.clientId,
      providerId: params.providerId,
      contractId: params.contractId,
      status: "ACTIVE",
      lastMessageAt: now,
      clientLastReadAt: now,
      messages: {
        create: {
          kind: "SYSTEM_CONTRACT",
          body,
          contractId: params.contractId,
          senderUserId: null,
        },
      },
    },
    select: { id: true },
  });

  return conversation;
}

export async function archiveTenderConversationByContractId(contractId: string) {
  await prisma.tenderConversation.updateMany({
    where: {
      contractId,
      status: "ACTIVE",
    },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}

export async function archiveTenderConversationsByTenderId(tenderId: string) {
  await prisma.tenderConversation.updateMany({
    where: {
      tenderId,
      status: "ACTIVE",
    },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}
