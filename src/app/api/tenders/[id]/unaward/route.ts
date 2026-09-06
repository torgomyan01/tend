import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { prisma } from "@/lib/prisma";
import { archiveTenderConversationsByTenderId } from "@/lib/tender-conversation";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export const dynamic = "force-dynamic";

async function cancelOpenContracts(tenderId: string, userId: string) {
  const contractDelegate = (
    prisma as unknown as {
      tenderContract?: {
        updateMany: (args: {
          where: {
            tenderId: string;
            status: { in: Array<"ACCEPTED" | "PENDING_CLIENT" | "PENDING_PROVIDER"> };
          };
          data: {
            status: "CANCELLED";
            cancelledAt: Date;
            cancelledById: string;
          };
        }) => Promise<unknown>;
      };
    }
  ).tenderContract;

  if (contractDelegate?.updateMany) {
    await contractDelegate.updateMany({
      where: {
        tenderId,
        status: { in: ["ACCEPTED", "PENDING_CLIENT", "PENDING_PROVIDER"] },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: userId,
      },
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE tendercontract
    SET
      status = 'CANCELLED',
      cancelledAt = ${new Date()},
      cancelledById = ${userId},
      updatedAt = ${new Date()}
    WHERE tenderId = ${tenderId}
      AND status IN ('ACCEPTED', 'PENDING_CLIENT', 'PENDING_PROVIDER')
  `;
}

/**
 * Պատվիրատուն հանում է արդեն ընտրված կատարողին (միայն AWARDED, ոչ COMPLETED)։
 * Մրցույթը վերադառնում է ACTIVE։
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: tenderId } = await context.params;

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: userId },
    select: {
      id: true,
      title: true,
      status: true,
      awardedBidId: true,
      awardedAt: true,
      awardedBid: {
        select: { id: true, providerId: true },
      },
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Previous partial unaward may have already cleared award fields
  if (tender.status === "ACTIVE" && !tender.awardedBidId) {
    await cancelOpenContracts(tenderId, userId);
    await archiveTenderConversationsByTenderId(tenderId).catch(() => undefined);
    await prisma.bid.updateMany({
      where: { tenderId, status: "ACCEPTED" },
      data: { status: "SHORTLISTED" },
    });
    return NextResponse.json({ ok: true, alreadyCleared: true });
  }

  if (tender.status !== "AWARDED" || !tender.awardedBidId || !tender.awardedBid) {
    return NextResponse.json({ error: "NOT_AWARDED" }, { status: 409 });
  }

  const winnerBidId = tender.awardedBid.id;
  const providerId = tender.awardedBid.providerId;
  const awardedAt = tender.awardedAt ?? new Date();
  const restoreFrom = new Date(awardedAt.getTime() - 10_000);

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      awardedBidId: null,
      awardedAt: null,
      status: "ACTIVE",
    },
  });

  await prisma.bid.update({
    where: { id: winnerBidId },
    data: { status: "SHORTLISTED" },
  });

  await prisma.bid.updateMany({
    where: {
      tenderId,
      id: { not: winnerBidId },
      status: "REJECTED",
      updatedAt: { gte: restoreFrom },
    },
    data: { status: "SHORTLISTED" },
  });

  await cancelOpenContracts(tenderId, userId);
  await archiveTenderConversationsByTenderId(tenderId).catch(() => undefined);

  try {
    const tenderPath = ROUTES.tenderDetail(tenderId);
    const url = absoluteAppUrl(tenderPath);
    const title = escapeTelegramHtml(tender.title);
    let text = `<b>Tend.am</b>\n<b>Կատարողի ընտրությունը հանվել է</b>\n\n`;
    text += `Պատվիրատուն հանել է ձեզ որպես կատարող «<b>${title}</b>» մրցույթից։`;
    if (url) {
      text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
    }

    await notifyUserById(providerId, {
      telegramText: text,
      emailSubject: `Կատարողի կարգավիճակը հանված է՝ ${tender.title}`,
      emailTitle: "Ընտրությունը հանված է",
      ctaLabel: "Բացել մրցույթը",
      ctaUrl: url || undefined,
      inApp: {
        category: "INFO",
        kind: NOTIFICATION_KINDS.CONTRACT_CANCELLED,
        title: "Կատարողի ընտրությունը հանված է",
        body: `Պատվիրատուն հանել է ձեզ «${tender.title}» մրցույթից։`,
        href: tenderPath,
        tenderId,
      },
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true });
}
