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
    `Պատվիրատուն ձեզ ընտրել է որպես կատարող։ Բոլոր գործարքները Tend.am-ում պաշտպանված են (escrow)։`,
    ``,
    `1) Երկու կողմն էլ հաստատում է էլեկտրոնային պայմանագիրը։`,
    `2) Պատվիրատուն բանկային փոխանցումով վճարում է Tend.am հաշվին (վճարման կոդով)։`,
    `3) Ադմինը հաստատում է մուտքը · միայն դրանից հետո սկսեք աշխատանքը։`,
    `4) Ավարտից հետո պատվիրատուն ազատում է գումարը · դուք ստանում եք վճարումը (հանած հարթակի միջնորդավճարը)։`,
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
