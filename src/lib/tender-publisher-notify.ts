import type { TenderStatus } from "@/generated/prisma/client";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { ROUTES } from "@/lib/routes";
import { TENDER_STATUS_LABEL } from "@/lib/tender-status";
import { escapeTelegramHtml } from "@/lib/telegram";

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

  const url = absoluteAppUrl(ROUTES.tenderDetail(params.tenderId));
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մրցույթի կարգավիճակը փոխվեց՝ ${params.tenderTitle}`,
    emailTitle: "Մրցույթի կարգավիճակ",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
  });
}

export async function notifyTenderPublisherAdminMessage(params: {
  userId: string;
  tenderTitle: string;
  body: string;
}): Promise<boolean> {
  const title = escapeTelegramHtml(params.tenderTitle);
  const body = escapeTelegramHtml(params.body);

  const text = `<b>Tend.am — մոդերացիա</b>\n<b>${title}</b>\n\n${body}`;

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մոդերացիա՝ ${params.tenderTitle}`,
    emailTitle: "Հաղորդագրություն մոդերատորից",
  });

  return true;
}

export async function notifyTenderPublisherDeleted(params: {
  userId: string;
  tenderTitle: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const text = `<b>Tend.am</b>\nՁեր մրցույթը հեռացվել է հարթակից։\n\n<b>${title}</b>`;

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Մրցույթը հեռացվել է՝ ${params.tenderTitle}`,
    emailTitle: "Մրցույթը հեռացվել է",
  });
}
