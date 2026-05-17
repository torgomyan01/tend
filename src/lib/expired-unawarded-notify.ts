import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

const WARNING_BODY =
  "Ձեր մրցույթի ավարտից հետո (առնվազն 3 դիմողի դեպքում) կատարող չեք ընտրել։ Սա չի համապատասխանում կայքի կանոններին։ Խնդրում ենք ապագայում ընտրել հաղթող կատարողին կամ չեղարկել մրցույթը ժամկետից առաջ։ Կրկնվող խախտումների դեպքում հաշիվը կարող է կարգելափակվել։";

export async function notifyExpiredUnawardedPenalty(params: {
  userId: string;
  tenderId: string;
  tenderTitle: string;
  paidBidCount: number;
}): Promise<void> {
  const title = escapeTelegramHtml(params.tenderTitle);
  const tenderUrl = absoluteAppUrl(ROUTES.tenderDetail(params.tenderId));

  let text = `<b>Tend.am — Նախազգուշացում</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `${escapeTelegramHtml(WARNING_BODY)}\n\n`;
  text += `<i>Գնահատականին ավելացվել է հարթակի նշում (1/5)։</i>`;

  if (tenderUrl) {
    text += `\n\n<a href="${escapeTelegramHtml(tenderUrl)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    forceAllChannels: true,
    emailSubject: `Նախազգուշացում՝ ${params.tenderTitle}`,
    emailTitle: "Ժամկետանց մրցույթ · կատարող չընտրված",
    emailPlainText: `${WARNING_BODY}\n\nԴիմողներ՝ ${params.paidBidCount}`,
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: tenderUrl || undefined,
    inApp: {
      category: "REJECTED",
      kind: NOTIFICATION_KINDS.EXPIRED_UNAWARDED_PENALTY,
      title: "Ժամկետանց · կատարող չընտրված",
      body: WARNING_BODY,
      href: ROUTES.tenderDetail(params.tenderId),
      tenderId: params.tenderId,
    },
  });
}
