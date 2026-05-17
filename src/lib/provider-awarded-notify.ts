import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyProviderAwarded(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Շնորհավորում ենք՝ ընտրվել եք որպես կատարող։</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `Պատվիրատուն ընտրել է ձեզ այս մրցույթի համար։ Կարող եք բացել մրցույթը և շարունակել կապը։`;

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Ընտրվել եք որպես կատարող՝ ${params.tenderTitle}`,
    emailTitle: "Շնորհավորում ենք",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED",
      kind: NOTIFICATION_KINDS.PROVIDER_AWARDED,
      title: "Ընտրվել եք որպես կատարող",
      body: `Պատվիրատուն ընտրել է ձեզ «${params.tenderTitle}» մրցույթի համար։`,
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}
