import type { TenderStatus, UserNotificationCategory } from "@/generated/prisma/client";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { TENDER_STATUS_LABEL } from "@/lib/tender-status";
import { escapeTelegramHtml } from "@/lib/telegram";

function categoryForStatus(next: TenderStatus): UserNotificationCategory {
  if (next === "ACTIVE" || next === "AWARDED" || next === "COMPLETED") {
    return "APPROVED";
  }
  if (next === "CANCELLED") {
    return "REJECTED";
  }
  if (next === "REVIEW") {
    return "PENDING";
  }
  return "INFO";
}

export async function notifyTenderPublisherStatusChange(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
  previousStatus: TenderStatus;
  nextStatus: TenderStatus;
  note?: string | null;
}) {
  if (params.previousStatus === params.nextStatus) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);
  const prevLabel = escapeTelegramHtml(
    TENDER_STATUS_LABEL[params.previousStatus],
  );
  const nextLabel = escapeTelegramHtml(TENDER_STATUS_LABEL[params.nextStatus]);

  let text = `<b>Tend.am</b> — Ձեր մրցույթի կարգավիճակը փոխվեց։\n\n`;
  text += `<b>${title}</b>\n`;
  text += `${prevLabel} → ${nextLabel}`;

  if (params.note?.trim()) {
    text += `\n\n<i>Մոդերատորի նշում՝</i> ${escapeTelegramHtml(params.note.trim())}`;
  }

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  const plainBody = [
    `${TENDER_STATUS_LABEL[params.previousStatus]} → ${TENDER_STATUS_LABEL[params.nextStatus]}`,
    params.note?.trim() ? `Նշում՝ ${params.note.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մրցույթի կարգավիճակը փոխվեց՝ ${params.tenderTitle}`,
    emailTitle: "Մրցույթի կարգավիճակ",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: categoryForStatus(params.nextStatus),
      kind: NOTIFICATION_KINDS.TENDER_STATUS_CHANGE,
      title: `Կարգավիճակ՝ ${TENDER_STATUS_LABEL[params.nextStatus]}`,
      body: plainBody,
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}

export async function notifyTenderPublisherAdminMessage(params: {
  userId: string;
  tenderTitle: string;
  body: string;
  tenderId?: string;
}): Promise<boolean> {
  const title = escapeTelegramHtml(params.tenderTitle);
  const body = escapeTelegramHtml(params.body);

  const text = `<b>Tend.am — մոդերացիա</b>\n<b>${title}</b>\n\n${body}`;

  const href = params.tenderId
    ? ROUTES.tenderDetail(params.tenderId)
    : undefined;

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մոդերացիա՝ ${params.tenderTitle}`,
    emailTitle: "Հաղորդագրություն մոդերատորից",
    inApp: {
      category: "INFO",
      kind: NOTIFICATION_KINDS.TENDER_ADMIN_MESSAGE,
      title: "Հաղորդագրություն մոդերատորից",
      body: params.body.trim(),
      href,
      tenderId: params.tenderId,
    },
  });

  return true;
}

export async function notifyTenderPublisherDeleted(params: {
  userId: string;
  tenderTitle: string;
  tenderId?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const text = `<b>Tend.am</b>\nՁեր մրցույթը հեռացվել է հարթակից։\n\n<b>${title}</b>`;

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մրցույթը հեռացվել է՝ ${params.tenderTitle}`,
    emailTitle: "Մրցույթը հեռացվել է",
    inApp: {
      category: "REJECTED",
      kind: NOTIFICATION_KINDS.TENDER_DELETED,
      title: "Մրցույթը հեռացվել է",
      body: `«${params.tenderTitle}» հեռացվել է հարթակից։`,
      tenderId: params.tenderId,
    },
  });
}
