import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  notifyContractProposedToPatron,
  notifyContractProposedToProvider,
} from "@/lib/tender-contract-notify";
import { createTenderConversationWithContractMessage } from "@/lib/tender-conversation";
import { CONTRACT_PARTY_SELECT, toContractParty } from "@/lib/tender-contract-party";
import { generateTenderContractText } from "@/lib/tender-contract-text";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bidId: z.string().min(1),
});

/**
 * Պատվիրատուն առաջարկում է կատարող · ստեղծվում է պայմանագիր (դեռ AWARDED չէ)։
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: session.user.id },
    select: {
      id: true,
      status: true,
      title: true,
      description: true,
      category: true,
      service: true,
      city: true,
      address: true,
      awardedBidId: true,
      client: { select: CONTRACT_PARTY_SELECT },
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (tender.status !== "ACTIVE") {
    return NextResponse.json({ error: "TENDER_NOT_ACTIVE" }, { status: 409 });
  }

  if (tender.awardedBidId) {
    return NextResponse.json({ error: "ALREADY_AWARDED" }, { status: 409 });
  }

  const openContract = await prisma.tenderContract.findFirst({
    where: {
      tenderId,
      status: { in: ["PENDING_CLIENT", "PENDING_PROVIDER"] },
    },
    select: { id: true },
  });

  if (openContract) {
    return NextResponse.json(
      { error: "CONTRACT_ALREADY_PENDING" },
      { status: 409 },
    );
  }

  const bid = await prisma.bid.findFirst({
    where: {
      id: parsed.data.bidId,
      tenderId,
      status: "SHORTLISTED",
    },
    select: {
      id: true,
      price: true,
      timelineDays: true,
      coverLetter: true,
      providerId: true,
      provider: { select: CONTRACT_PARTY_SELECT },
    },
  });

  if (!bid) {
    return NextResponse.json({ error: "BID_NOT_ELIGIBLE" }, { status: 404 });
  }

  const generatedAt = new Date();
  const bodyText = generateTenderContractText({
    contractRef: `${tenderId.slice(0, 8).toUpperCase()}-${bid.id.slice(0, 6).toUpperCase()}`,
    generatedAt,
    tender: {
      id: tender.id,
      title: tender.title,
      description: tender.description,
      category: tender.category,
      service: tender.service,
      city: tender.city,
      address: tender.address,
    },
    bid: {
      price: Number(bid.price),
      timelineDays: bid.timelineDays,
      coverLetter: bid.coverLetter,
    },
    client: toContractParty(tender.client, "Պատվիրատու"),
    provider: toContractParty(bid.provider, "Կատարող"),
  });

  const contract = await prisma.tenderContract.create({
    data: {
      tenderId,
      bidId: bid.id,
      status: "PENDING_CLIENT",
      bodyText,
      templateVersion: "1",
    },
    select: { id: true, status: true },
  });

  let conversationId: string | null = null;
  try {
    const conversation = await createTenderConversationWithContractMessage({
      tenderId,
      clientId: session.user.id,
      providerId: bid.providerId,
      contractId: contract.id,
      tenderTitle: tender.title,
    });
    conversationId = conversation.id;
  } catch {
    /* conversation failure should not block contract */
  }

  try {
    const href = conversationId
      ? ROUTES.messageThread(conversationId)
      : ROUTES.contract(contract.id);
    await notifyContractProposedToPatron({
      clientUserId: session.user.id,
      tenderTitle: tender.title,
      tenderId,
      href,
    });
    await notifyContractProposedToProvider({
      providerUserId: bid.providerId,
      tenderTitle: tender.title,
      tenderId,
      href,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({
    ok: true,
    contract,
    conversationId,
  });
}
