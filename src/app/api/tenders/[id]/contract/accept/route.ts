import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyProviderAwarded } from "@/lib/provider-awarded-notify";
import {
  notifyContractAwaitingProvider,
  notifyContractFullyAcceptedToPatron,
} from "@/lib/tender-contract-notify";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

/**
 * Պայմանագրի հաստատում՝ նախ պատվիրատու, ապա կատարող։
 * Երկրորդ հաստատումից հետո մրցույթը դառնում է AWARDED։
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
      bid: {
        select: {
          id: true,
          providerId: true,
          provider: { select: { name: true, email: true } },
        },
      },
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

  if (contract.status === "PENDING_CLIENT") {
    if (!isClient) {
      return NextResponse.json({ error: "WAITING_FOR_CLIENT" }, { status: 409 });
    }

    await prisma.tenderContract.update({
      where: { id: contract.id },
      data: {
        status: "PENDING_PROVIDER",
        clientAcceptedAt: new Date(),
      },
    });

    try {
      await notifyContractAwaitingProvider({
        providerUserId: contract.bid.providerId,
        tenderTitle: tender.title,
        tenderId,
        href: ROUTES.contract(contract.id),
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({ ok: true, status: "PENDING_PROVIDER" });
  }

  if (!isProvider) {
    return NextResponse.json(
      { error: "WAITING_FOR_PROVIDER" },
      { status: 409 },
    );
  }

  const now = new Date();

  await prisma.tenderContract.update({
    where: { id: contract.id },
    data: {
      status: "ACCEPTED",
      providerAcceptedAt: now,
    },
  });

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      awardedBidId: contract.bid.id,
      awardedAt: now,
      status: "AWARDED",
    },
  });

  await prisma.bid.update({
    where: { id: contract.bid.id },
    data: { status: "ACCEPTED" },
  });

  await prisma.bid.updateMany({
    where: {
      tenderId,
      id: { not: contract.bid.id },
      status: "SHORTLISTED",
    },
    data: { status: "REJECTED" },
  });

  try {
    await notifyProviderAwarded({
      userId: contract.bid.providerId,
      tenderTitle: tender.title,
      tenderId,
    });
    await notifyContractFullyAcceptedToPatron({
      clientUserId: tender.clientId,
      tenderTitle: tender.title,
      tenderId,
      providerName:
        contract.bid.provider.name?.trim() ||
        contract.bid.provider.email ||
        "Կատարող",
      href: ROUTES.contract(contract.id),
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, status: "ACCEPTED" });
}
