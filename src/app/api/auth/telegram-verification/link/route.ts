import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { maskArmenianPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { issueTelegramLinkForUser } from "@/lib/telegram-link";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      phone: true,
      telegramVerifiedAt: true,
      isBlocked: true,
    },
  });

  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (user.telegramVerifiedAt) {
    return NextResponse.json({ error: "ALREADY_VERIFIED" }, { status: 400 });
  }

  if (!user.phone) {
    return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
  }

  const link = await issueTelegramLinkForUser(user.id);

  return NextResponse.json({
    userId: user.id,
    phoneMasked: maskArmenianPhone(user.phone),
    ...link,
  });
}
