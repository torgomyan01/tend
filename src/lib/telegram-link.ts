import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTelegramBotUrl } from "@/lib/telegram";

/** Telegram կապման հղման վավերականությունը (գրանցում / կրկնակի փորձ)։ */
export const TELEGRAM_LINK_TTL_MS = 24 * 60 * 60 * 1000;

export function createTelegramLinkToken() {
  return randomBytes(24).toString("hex");
}

export async function issueTelegramLinkForUser(userId: string) {
  const telegramLinkToken = createTelegramLinkToken();
  const telegramLinkTokenExpiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramLinkToken,
      telegramLinkTokenExpiresAt,
    },
  });

  return {
    telegramBotUrl: getTelegramBotUrl(telegramLinkToken),
    expiresAt: telegramLinkTokenExpiresAt.toISOString(),
  };
}
