import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPendingTelegramUpdates } from "@/lib/telegram-verification";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
  }

  await processPendingTelegramUpdates().catch(() => undefined);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isVerified: true,
      telegramVerifiedAt: true,
      telegramChatId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    verified: Boolean(user.telegramVerifiedAt),
    fullyVerified: user.isVerified,
    telegramLinked: Boolean(user.telegramChatId),
  });
}
