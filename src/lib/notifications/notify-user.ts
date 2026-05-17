import type { NotificationChannel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  plainTextToEmailHtml,
  renderNotificationEmailTemplate,
} from "@/lib/email/templates/notification";
import { trySendEmail } from "@/lib/email/send";
import { isEmailVerified } from "@/lib/account-verification";
import {
  trySendTelegramMessage,
  type TelegramSendOptions,
} from "@/lib/telegram";

export type NotifyPayload = {
  /** Telegram HTML տեքստ */
  telegramText: string;
  telegramOptions?: TelegramSendOptions;
  /** Email-ի վերնագիր */
  emailSubject: string;
  /** Email-ի HTML մարմին (կամ plain → convert) */
  emailBodyHtml?: string;
  /** Plain text → email paragraphs */
  emailPlainText?: string;
  emailTitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

function allowsTelegram(
  channel: NotificationChannel,
  hasTelegram: boolean,
): boolean {
  if (!hasTelegram) return false;
  return channel === "TELEGRAM" || channel === "BOTH";
}

function allowsEmail(
  channel: NotificationChannel,
  emailVerified: boolean,
): boolean {
  if (!emailVerified) return false;
  return channel === "EMAIL" || channel === "BOTH";
}

async function loadUserTargets(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      telegramChatId: true,
      notificationChannel: true,
      isBlocked: true,
    },
  });
}

/** Ուղարկում է Telegram և/կամ Email՝ ըստ օգտատիրոջ notificationChannel կարգավորումների։ */
export async function notifyUserById(
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  const user = await loadUserTargets(userId);
  if (!user || user.isBlocked) {
    return;
  }

  await notifyUserDirect(
    {
      telegramChatId: user.telegramChatId,
      email: user.email,
      emailVerified: user.emailVerified,
      notificationChannel: user.notificationChannel,
    },
    payload,
  );
}

export async function notifyUserDirect(
  target: {
    telegramChatId?: string | null;
    email?: string | null;
    emailVerified?: Date | null;
    notificationChannel?: NotificationChannel;
  },
  payload: NotifyPayload,
): Promise<void> {
  const channel = target.notificationChannel ?? "TELEGRAM";
  const emailOk = isEmailVerified(target);
  const hasTelegram = Boolean(target.telegramChatId);

  if (allowsTelegram(channel, hasTelegram) && target.telegramChatId) {
    await trySendTelegramMessage(
      target.telegramChatId,
      payload.telegramText,
      payload.telegramOptions,
    );
  }

  if (allowsEmail(channel, emailOk) && target.email) {
    const bodyHtml =
      payload.emailBodyHtml ??
      (payload.emailPlainText
        ? plainTextToEmailHtml(stripTelegramHtml(payload.emailPlainText))
        : plainTextToEmailHtml(stripTelegramHtml(payload.telegramText)));

    const html = renderNotificationEmailTemplate({
      title: payload.emailTitle ?? payload.emailSubject,
      previewText: payload.emailSubject,
      bodyHtml,
      ctaLabel: payload.ctaLabel,
      ctaUrl: payload.ctaUrl,
    });

    await trySendEmail({
      to: target.email,
      subject: payload.emailSubject,
      html,
    });
  }
}

/** Telegram HTML թեգերը հեռացնել email տարբերակի համար */
function stripTelegramHtml(text: string): string {
  return text
    .replace(/<a href="([^"]+)">([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?i>/gi, "")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<[^>]+>/g, "");
}
