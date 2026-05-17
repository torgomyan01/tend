import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

/** Ծանուցում դիմողին՝ առաջարկը հաստատվել է և հասել է պատվիրատուին։ */
export async function notifyProviderBidModerationApproved(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Ձեր առաջարկը հաստատվել է և հաջողությամբ հասել է պատվիրատուին։</b>\n\n`;
  text += `<b>${title}</b>`;

  const url = absoluteAppUrl(ROUTES.tenderDetail(params.tenderId));
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Առաջարկը հաստատված է՝ ${params.tenderTitle}`,
    emailTitle: "Առաջարկը հաստատված է",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
  });
}
