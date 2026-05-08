import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";
import { formatAmd } from "@/lib/format";
import type { RefundedBidInfo } from "@/lib/bid-fee-refund";

function tenderPublicUrl(tenderId: string): string {
  const base =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/tenders/${tenderId}`;
}

/** Ծանուցում մասնագետին՝ մուտքի վճարը վերադարձված է կրեդիտով։ */
export async function notifyProviderBidFeeRefunded(
  info: RefundedBidInfo,
  reasonLabel: string,
): Promise<void> {
  if (!info.providerChatId) return;

  const title = escapeTelegramHtml(info.tenderTitle);
  const reason = escapeTelegramHtml(reasonLabel);
  const amount = escapeTelegramHtml(formatAmd(info.amount));

  let text = `<b>Tend.am</b>\n<b>Մուտքի վճարը վերադարձված է կրեդիտով</b>\n\n`;
  text += `<b>${title}</b>\n`;
  text += `Պատճառ՝ ${reason}\n`;
  text += `Կրեդիտացված գումար՝ <b>${amount}</b>\n`;
  text += `Կրեդիտը հասանելի է ձեր դրամապանակում նոր մրցույթներին դիմելու համար։`;

  const url = tenderPublicUrl(info.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(info.providerChatId, text);
}

export const REFUND_REASON_LABELS = {
  TENDER_CANCELLED: "Մրցույթը չեղարկվել է",
  TENDER_DELETED: "Մրցույթը հեռացվել է",
  TENDER_REJECTED: "Մրցույթը մերժվել է մոդերացիայի կողմից",
  BID_REJECTED_BY_MODERATOR: "Առաջարկը մերժվել է մոդերացիայի կողմից",
} as const;
