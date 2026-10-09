import { randomBytes } from "node:crypto";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { trySendDexatelSms, isDexatelConfigured } from "@/lib/dexatel";
import { trySendEmail } from "@/lib/email/send";
import { renderPasswordResetEmailTemplate } from "@/lib/email/templates/password-reset";
import { normalizeArmenianPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";
import type { PasswordResetChannel } from "@/lib/password-reset-types";

export type { PasswordResetChannel } from "@/lib/password-reset-types";

export const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function createResetToken() {
  return randomBytes(24).toString("hex");
}

function expiresLabel(expiresAt: Date) {
  return expiresAt.toLocaleTimeString("hy-AM", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickChannel(user: {
  telegramChatId: string | null;
  telegramVerifiedAt: Date | null;
  email: string | null;
  emailVerified: Date | null;
}): PasswordResetChannel {
  if (user.telegramVerifiedAt && user.telegramChatId) {
    return "TELEGRAM";
  }
  if (user.emailVerified && user.email?.trim()) {
    return "EMAIL";
  }
  return "SMS";
}

async function sendViaTelegram(params: {
  chatId: string;
  name: string | null;
  resetUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  const namePart = params.name?.trim()
    ? `, ${escapeTelegramHtml(params.name.trim())}`
    : "";
  const text = `Բարև${namePart}։\n\nՍեղմեք ներքևի կոճակը՝ Tend.am-ի գաղտնաբառը վերականգնելու համար։\n\nՀղումը գործում է մինչև ${expiresLabel(params.expiresAt)}։`;

  return trySendTelegramMessage(params.chatId, text, {
    replyMarkup: {
      inline_keyboard: [[{ text: "Վերականգնել գաղտնաբառը", url: params.resetUrl }]],
    },
  });
}

async function sendViaEmail(params: {
  email: string;
  name: string | null;
  resetUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  const html = renderPasswordResetEmailTemplate({
    name: params.name,
    resetUrl: params.resetUrl,
    expiresLabel: expiresLabel(params.expiresAt),
  });
  return trySendEmail({
    to: params.email,
    subject: "Tend.am · գաղտնաբառի վերականգնում",
    html,
  });
}

async function sendViaSms(params: {
  phone: string;
  resetUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  if (!isDexatelConfigured()) {
    console.warn("[password-reset] SMS requested but Dexatel is not configured");
    return false;
  }
  // Dexatel shortens URLs wrapped as {url=https://...}
  const text = `Tend.am գաղտնաբառի վերականգնում։ Բացեք՝ {url=${params.resetUrl}} (մինչև ${expiresLabel(params.expiresAt)})`;
  const result = await trySendDexatelSms({ to: params.phone, text });
  return result.ok;
}

/**
 * Phone-first password reset.
 * Channel priority: Telegram → verified email → SMS (Dexatel).
 */
export async function requestPasswordResetByPhone(rawPhone: string): Promise<{
  ok: true;
  channel?: PasswordResetChannel;
  cooldown?: boolean;
}> {
  const phone = normalizeArmenianPhone(rawPhone);
  if (!phone) {
    return { ok: true };
  }

  const user = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      telegramChatId: true,
      telegramVerifiedAt: true,
      isBlocked: true,
      passwordResetTokenExpiresAt: true,
    },
  });

  if (!user || user.isBlocked || !user.phone) {
    return { ok: true };
  }

  if (user.passwordResetTokenExpiresAt) {
    const approxCreated =
      user.passwordResetTokenExpiresAt.getTime() - PASSWORD_RESET_TTL_MS;
    if (Date.now() - approxCreated < RESEND_COOLDOWN_MS) {
      return { ok: true, cooldown: true };
    }
  }

  const token = createResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const resetUrl = absoluteAppUrl(
    `/reset-password?token=${encodeURIComponent(token)}`,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    },
  });

  const preferred = pickChannel(user);
  const attempts: PasswordResetChannel[] =
    preferred === "TELEGRAM"
      ? ["TELEGRAM", "EMAIL", "SMS"]
      : preferred === "EMAIL"
        ? ["EMAIL", "SMS"]
        : ["SMS"];

  for (const channel of attempts) {
    let sent = false;
    if (channel === "TELEGRAM" && user.telegramChatId && user.telegramVerifiedAt) {
      sent = await sendViaTelegram({
        chatId: user.telegramChatId,
        name: user.name,
        resetUrl,
        expiresAt,
      });
    } else if (channel === "EMAIL" && user.emailVerified && user.email) {
      sent = await sendViaEmail({
        email: user.email,
        name: user.name,
        resetUrl,
        expiresAt,
      });
    } else if (channel === "SMS") {
      sent = await sendViaSms({
        phone: user.phone,
        resetUrl,
        expiresAt,
      });
    }

    if (sent) {
      return { ok: true, channel };
    }
  }

  return { ok: true };
}
