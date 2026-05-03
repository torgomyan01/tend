import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPartiesTenderWorkCompleted } from "@/lib/tender-completed-notify";

export const dynamic = "force-dynamic";

/** Պատվիրատու՝ AWARDED → COMPLETED (աշխատանքը ամբողջովին ավարտված է)։ */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: session.user.id },
    select: {
      id: true,
      status: true,
      title: true,
      client: { select: { telegramChatId: true } },
      awardedBid: {
        select: {
          provider: { select: { telegramChatId: true } },
        },
      },
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (tender.status !== "AWARDED") {
    return NextResponse.json({ error: "NOT_AWARDED" }, { status: 409 });
  }

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  try {
    await notifyPartiesTenderWorkCompleted({
      tenderTitle: tender.title,
      tenderId,
      providerChatId: tender.awardedBid?.provider.telegramChatId,
      clientChatId: tender.client.telegramChatId,
      request,
    });
  } catch {
    /* Telegram-ը չպետք է կասեցնի փակումը */
  }

  return NextResponse.json({ ok: true });
}
