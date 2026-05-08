import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyProviderAwarded } from "@/lib/provider-awarded-notify";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bidId: z.string().min(1),
});

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
    select: { id: true, status: true, title: true, awardedBidId: true },
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

  const bid = await prisma.bid.findFirst({
    where: {
      id: parsed.data.bidId,
      tenderId,
      status: "SHORTLISTED",
    },
    select: {
      id: true,
      providerId: true,
      provider: {
        select: {
          telegramChatId: true,
        },
      },
    },
  });

  if (!bid) {
    return NextResponse.json({ error: "BID_NOT_ELIGIBLE" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.tender.update({
      where: { id: tenderId },
      data: {
        awardedBidId: bid.id,
        awardedAt: new Date(),
        status: "AWARDED",
      },
    });

    await tx.bid.update({
      where: { id: bid.id },
      data: { status: "ACCEPTED" },
    });

    await tx.bid.updateMany({
      where: {
        tenderId,
        id: { not: bid.id },
        status: "SHORTLISTED",
      },
      data: { status: "REJECTED" },
    });
  });

  try {
    await notifyProviderAwarded({
      chatId: bid.provider.telegramChatId,
      tenderTitle: tender.title,
      tenderId,
    });
  } catch {
    /* Telegram-ը չպետք է կասեցնի ընտրությունը */
  }

  return NextResponse.json({ ok: true });
}
