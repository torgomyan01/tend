import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

/** Ծանուցում դիմողին՝ ընտրվել է որպես վերջնական կատարող։ */
export async function notifyProviderAwarded(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Շնորհավորում ենք՝ ընտրվել եք որպես կատարող։</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `Պատվիրատուն ընտրել է ձեզ այս մրցույթի համար։ Կարող եք բացել մրցույթը և շարունակել կապը։`;

  const url = absoluteAppUrl(ROUTES.tenderDetail(params.tenderId));
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Ընտրվել եք որպես կատարող՝ ${params.tenderTitle}`,
    emailTitle: "Շնորհավորում ենք",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
  });
}
