import { formatAmd } from "@/lib/format";
import type { RefundedBidInfo } from "@/lib/bid-fee-refund";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyProviderBidFeeRefunded(
  info: RefundedBidInfo,
  reasonLabel: string,
): Promise<void> {
  const title = escapeTelegramHtml(info.tenderTitle);
  const reason = escapeTelegramHtml(reasonLabel);
  const amount = escapeTelegramHtml(formatAmd(info.amount));

  let text = `<b>Tend.am</b>\n<b>Մուտքի վճարը վերադարձված է կրեդիտով</b>\n\n`;
  text += `<b>${title}</b>\n`;
  text += `Պատճառ՝ ${reason}\n`;
  text += `Կրեդիտացված գումար՝ <b>${amount}</b>\n`;
  text += `Կրեդիտը հասանելի է ձեր դրամապանակում նոր մրցույթներին դիմելու համար։`;

  const tenderPath = ROUTES.tenderDetail(info.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(info.providerId, {
    telegramText: text,
    emailSubject: `Մուտքի վճարի վերադարձ՝ ${info.tenderTitle}`,
    emailTitle: "Վերադարձ կրեդիտով",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "INFO",
      kind: NOTIFICATION_KINDS.BID_FEE_REFUND,
      title: "Մուտքի վճարի վերադարձ",
      body: `«${info.tenderTitle}» — ${reasonLabel}. Գումար՝ ${formatAmd(info.amount)} (կրեդիտ)`,
      href: tenderPath,
      tenderId: info.tenderId,
      bidId: info.bidId,
    },
  });
}

export const REFUND_REASON_LABELS = {
  TENDER_CANCELLED: "Մրցույթը չեղարկվել է",
  TENDER_DELETED: "Մրցույթը հեռացվել է",
  TENDER_REJECTED: "Մրցույթը մերժվել է մոդերացիայի կողմից",
  BID_REJECTED_BY_MODERATOR: "Առաջարկը մերժվել է մոդերացիայի կողմից",
} as const;
