import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyContractCancelled } from "@/lib/tender-contract-notify";
import { archiveTenderConversationByContractId } from "@/lib/tender-conversation";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

/**
 * Չեղարկել ընթացիկ պայմանագրի առաջարկը (պատվիրատու կամ առաջարկված կատարող)։
 * Դրանից հետո պատվիրատուն կարող է այլ կատարող ընտրել։
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;
  const userId = session.user.id;

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
      awardedBidId: true,
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (tender.status !== "ACTIVE" || tender.awardedBidId) {
    return NextResponse.json({ error: "TENDER_NOT_ACTIVE" }, { status: 409 });
  }

  const contract = await prisma.tenderContract.findFirst({
    where: {
      tenderId,
      status: { in: ["PENDING_CLIENT", "PENDING_PROVIDER"] },
    },
    include: {
      bid: { select: { providerId: true } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "NO_PENDING_CONTRACT" }, { status: 404 });
  }

  const isClient = userId === tender.clientId;
  const isProvider = userId === contract.bid.providerId;

  if (!isClient && !isProvider) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.tenderContract.update({
    where: { id: contract.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: userId,
    },
  });

  try {
    await archiveTenderConversationByContractId(contract.id);
  } catch {
    /* non-blocking */
  }

  const conversation = await prisma.tenderConversation.findUnique({
    where: { contractId: contract.id },
    select: { id: true },
  });
  const href = conversation
    ? ROUTES.messageThread(conversation.id)
    : ROUTES.contract(contract.id);

  const recipientId = isClient
    ? contract.bid.providerId
    : tender.clientId;

  // Notify the other party only if they already knew (provider pending or both)
  if (
    recipientId !== userId &&
    (contract.status === "PENDING_PROVIDER" || isProvider)
  ) {
    try {
      await notifyContractCancelled({
        recipientUserId: recipientId,
        tenderTitle: tender.title,
        tenderId,
        byPatron: isClient,
        href,
      });
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({ ok: true });
}
