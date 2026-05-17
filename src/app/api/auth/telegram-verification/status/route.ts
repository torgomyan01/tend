import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAccountVerified } from "@/lib/account-verification";
import { maskArmenianPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { processPendingTelegramUpdates } from "@/lib/telegram-verification";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  await processPendingTelegramUpdates().catch(() => undefined);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      phone: true,
      telegramVerifiedAt: true,
      emailVerified: true,
      telegramChatId: true,
      telegramLinkTokenExpiresAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    verified: isAccountVerified(user),
    telegramVerified: Boolean(user.telegramVerifiedAt),
    emailVerified: Boolean(user.emailVerified),
    telegramLinked: Boolean(user.telegramChatId),
    phoneMasked: user.phone ? maskArmenianPhone(user.phone) : null,
    linkExpiresAt: user.telegramLinkTokenExpiresAt?.toISOString() ?? null,
  });
}
