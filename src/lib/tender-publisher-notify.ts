import type { TenderStatus } from "@/generated/prisma/client";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";
import { TENDER_STATUS_LABEL } from "@/lib/tender-status";

function tenderPublicUrl(tenderId: string) {
  const base =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!base) {
    return "";
  }

  return `${base.replace(/\/$/, "")}/tenders/${tenderId}`;
}

export async function notifyTenderPublisherStatusChange(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
  previousStatus: TenderStatus;
  nextStatus: TenderStatus;
  note?: string | null;
}) {
  if (!params.chatId || params.previousStatus === params.nextStatus) {
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

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}

export async function notifyTenderPublisherAdminMessage(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  body: string;
}): Promise<boolean> {
  if (!params.chatId) {
    return false;
  }

  const title = escapeTelegramHtml(params.tenderTitle);
  const body = escapeTelegramHtml(params.body);

  const text = `<b>Tend.am — մոդերացիա</b>\n<b>${title}</b>\n\n${body}`;

  return trySendTelegramMessage(params.chatId, text);
}

export async function notifyTenderPublisherDeleted(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
}) {
  if (!params.chatId) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);
  const text = `<b>Tend.am</b>\nՁեր մրցույթը հեռացվել է հարթակից։\n\n<b>${title}</b>`;

  await trySendTelegramMessage(params.chatId, text);
}
