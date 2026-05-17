import type { NotificationChannel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  plainTextToEmailHtml,
  renderNotificationEmailTemplate,
} from "@/lib/email/templates/notification";
import { trySendEmail } from "@/lib/email/send";
import { isEmailVerified } from "@/lib/account-verification";
import type { InAppNotificationInput } from "@/lib/notifications/in-app";
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
  emailBodyHtml?: string;
  emailPlainText?: string;
  emailTitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Կայքի ներսի ծանուցում (միշտ պահվում է, անկախ Telegram/Email-ից) */
  inApp: InAppNotificationInput;
  /** true — Telegram չուղարկել (օր. աջակցության պատասխան) */
  skipTelegram?: boolean;
  /** true — ուղարկել Telegram + Email (անկախ notificationChannel-ից) */
  forceAllChannels?: boolean;
};

function stripTelegramHtml(text: string): string {
  return text
    .replace(/<a href="([^"]+)">([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?i>/gi, "")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

async function persistInAppNotification(
  userId: string,
  inApp: InAppNotificationInput,
  delivery: { sentTelegram: boolean; sentEmail: boolean },
) {
  await prisma.userNotification.create({
    data: {
      userId,
      category: inApp.category,
      kind: inApp.kind,
      title: inApp.title,
      body: inApp.body,
      href: inApp.href ?? null,
      tenderId: inApp.tenderId ?? null,
      bidId: inApp.bidId ?? null,
      sentTelegram: delivery.sentTelegram,
      sentEmail: delivery.sentEmail,
    },
  });
}

/** Ուղարկում է Telegram, Email և պահում կայքի ծանուցումների ցանկում։ */
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
      userId,
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
    userId?: string;
    telegramChatId?: string | null;
    email?: string | null;
    emailVerified?: Date | null;
    notificationChannel?: NotificationChannel;
  },
  payload: NotifyPayload,
): Promise<{ sentTelegram: boolean; sentEmail: boolean }> {
  const channel = target.notificationChannel ?? "TELEGRAM";
  const emailOk = isEmailVerified(target);
  const hasTelegram = Boolean(target.telegramChatId);
  let sentTelegram = false;
  let sentEmail = false;

  const tryTelegram =
    !payload.skipTelegram &&
    target.telegramChatId &&
    (payload.forceAllChannels || allowsTelegram(channel, hasTelegram));

  if (tryTelegram && target.telegramChatId) {
    sentTelegram = await trySendTelegramMessage(
      target.telegramChatId,
      payload.telegramText,
      payload.telegramOptions,
    );
  }

  const tryEmail =
    target.email &&
    (payload.forceAllChannels
      ? Boolean(target.email)
      : allowsEmail(channel, emailOk));

  if (tryEmail && target.email) {
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

    sentEmail = await trySendEmail({
      to: target.email,
      subject: payload.emailSubject,
      html,
    });
  }

  if (target.userId) {
    await persistInAppNotification(target.userId, payload.inApp, {
      sentTelegram,
      sentEmail,
    });
  }

  return { sentTelegram, sentEmail };
}

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
