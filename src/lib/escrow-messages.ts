import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { ESCROW_STATUS_LABEL } from "@/lib/escrow";
import { formatAmd } from "@/lib/format";
import type { TenderEscrowStatus } from "@/generated/prisma/client";

export async function postEscrowSystemMessage(params: {
  contractId: string;
  body: string;
}) {
  const conversation = await prisma.tenderConversation.findUnique({
    where: { contractId: params.contractId },
    select: { id: true },
  });
  if (!conversation) return;

  const now = new Date();
  await prisma.$transaction([
    prisma.tenderMessage.create({
      data: {
        conversationId: conversation.id,
        senderUserId: null,
        kind: "SYSTEM_ESCROW",
        body: params.body,
        contractId: params.contractId,
      },
    }),
    prisma.tenderConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: now },
    }),
  ]);
}

export function escrowFundedMessage(params: {
  amount: number;
  paymentCode: string;
}): string {
  return [
    "Պաշտպանված գործարք · փոխանցումը հաստատված է",
    ``,
    `Պատվիրատուի փոխանցումը կատարված է և հաստատված է ադմինի կողմից։`,
    `Գումար՝ ${formatAmd(params.amount)}`,
    `Կոդ՝ ${params.paymentCode}`,
    ``,
    `Այժմ կողմերը կարող եք սկսել համագործակցությունը։`,
  ].join("\n");
}

export function escrowAwaitingPaymentMessage(params: {
  amount: number;
  paymentCode: string;
  contractId: string;
}): string {
  return [
    "Ընտրվել եք որպես կատարող",
    ``,
    `Պայմանագիրը կնքված է։ Խնդրում ենք սպասել՝ մինչև պատվիրատուն վճարի ${formatAmd(params.amount)} և Tend.am-ը հաստատի մուտքը (գումարը կպահվի պաշտպանված գործարքով)։`,
    ``,
    `Միայն դրանից հետո կարող եք սկսել աշխատանքը։`,
    ``,
    `Պարտադիր վճարման կոդ (պատվիրատուի համար)՝ ${params.paymentCode}`,
    `Մանրամասներ՝ ${ROUTES.contract(params.contractId)}`,
  ].join("\n");
}

export function escrowStatusChangeMessage(
  status: TenderEscrowStatus,
  extra?: string,
): string {
  const label = ESCROW_STATUS_LABEL[status] ?? status;
  return extra
    ? `Պաշտպանված գործարք · ${label}\n\n${extra}`
    : `Պաշտպանված գործարք · ${label}`;
}

export function escrowReleaseRequestedMessage(): string {
  return escrowStatusChangeMessage(
    "RELEASE_PENDING",
    "Պատվիրատուն հաստատել է աշխատանքը։ Ադմինը կփոխանցի գումարը կատարողին։",
  );
}

/** Short award-time chat message (no full journey dump). */
export function escrowProtectedDealStartedMessage(params: {
  amount: number;
  feePercent: number;
  providerReceives: number;
  contractId: string;
}): string {
  return [
    "Պաշտպանված գործարք սկսված է",
    ``,
    `Գումար՝ ${formatAmd(params.amount)}`,
    `Կատարողը կստանա՝ ${formatAmd(params.providerReceives)} (միջնորդավճար ${params.feePercent}%)`,
    ``,
    `Հաջորդ քայլը՝ երկկողմանի պայմանագիր, ապա վճարում Tend.am հաշվին։`,
    `Մանրամասներ՝ ${ROUTES.contract(params.contractId)}`,
  ].join("\n");
}
