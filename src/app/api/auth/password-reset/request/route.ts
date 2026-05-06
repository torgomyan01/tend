import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().email().max(160),
});

function createResetToken() {
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Չենք բացահայտում՝ user կա, թե չէ։
  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      telegramChatId: true,
      telegramVerifiedAt: true,
      isBlocked: true,
    },
  });

  if (!user || user.isBlocked) {
    return NextResponse.json({ ok: true });
  }

  if (!user.telegramVerifiedAt || !user.telegramChatId) {
    // Telegram-ը պարտադիր է այս flow-ում։
    return NextResponse.json({ ok: true });
  }

  const token = createResetToken();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const resetUrl = appUrl
    ? `${appUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`
    : null;

  const namePart = user.name?.trim() ? `, ${escapeTelegramHtml(user.name.trim())}` : "";
  const text = resetUrl
    ? `Բարև${namePart}։\n\nՍեղմեք ներքևի կոճակը՝ Tend.am-ի գաղտնաբառը վերականգնելու համար։\n\nՀղումը գործում է մինչև ${expiresAt.toLocaleTimeString("hy-AM", {
        hour: "2-digit",
        minute: "2-digit",
      })}։`
    : `Բարև${namePart}։\n\nԳաղտնաբառի վերականգնումը հասանելի չէ, քանի որ NEXT_PUBLIC_APP_URL-ը կարգավորված չէ։`;

  if (resetUrl) {
    await trySendTelegramMessage(user.telegramChatId, text, {
      replyMarkup: {
        inline_keyboard: [[{ text: "Վերականգնել գաղտնաբառը", url: resetUrl }]],
      },
    });
  } else {
    await trySendTelegramMessage(user.telegramChatId, text);
  }

  return NextResponse.json({ ok: true });
}

