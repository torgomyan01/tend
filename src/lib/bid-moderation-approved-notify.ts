import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyProviderBidModerationApproved(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Ձեր առաջարկը հաստատվել է և հաջողությամբ հասել է պատվիրատուին։</b>\n\n`;
  text += `<b>${title}</b>`;

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Առաջարկը հաստատված է՝ ${params.tenderTitle}`,
    emailTitle: "Առաջարկը հաստատված է",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED",
      kind: NOTIFICATION_KINDS.BID_MODERATION_APPROVED,
      title: "Առաջարկը հաստատված է",
      body: `Ձեր առաջարկը հասել է պատվիրատուին՝ «${params.tenderTitle}» մրցույթի համար։`,
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}
