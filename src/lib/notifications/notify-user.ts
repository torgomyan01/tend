import type { NotificationChannel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  plainTextToEmailHtml,
  renderNotificationEmailTemplate,
} from "@/lib/email/templates/notification";
import { trySendEmail } from "@/lib/email/send";
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
  /** @deprecated Այլևս պետք չէ · Telegram + Email միշտ փորձվում են հասանելի լինելու դեպքում */
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

/** Ուղարկում է Telegram (եթե կապված է), Email (եթե կա գրանցված հասցե) և պահում in-app ծանուցում։ */
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
  let sentTelegram = false;
  let sentEmail = false;

  const tryTelegram =
    !payload.skipTelegram && Boolean(target.telegramChatId?.trim());

  if (tryTelegram && target.telegramChatId) {
    sentTelegram = await trySendTelegramMessage(
      target.telegramChatId,
      payload.telegramText,
      payload.telegramOptions,
    );
  }

  const email = target.email?.trim() || "";
  // Գրանցված email → միշտ փորձել ուղարկել (նույն ծանուցումը, ինչ Telegram-ում)
  const tryEmail = Boolean(email);

  if (tryEmail) {
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
      to: email,
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
