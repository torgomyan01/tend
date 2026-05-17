import { formatAmd } from "@/lib/format";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyTenderOwnerNewBid(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
  providerDisplayName: string;
  providerEmail: string;
  providerPhone: string | null;
  priceAmd: number;
  timelineDays: number;
  coverLetter: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const name = escapeTelegramHtml(params.providerDisplayName);
  const email = escapeTelegramHtml(params.providerEmail);
  const phoneLine = params.providerPhone?.trim()
    ? escapeTelegramHtml(params.providerPhone.trim())
    : "չկա";

  const excerptRaw =
    params.coverLetter.trim().length > 450
      ? `${params.coverLetter.trim().slice(0, 450)}…`
      : params.coverLetter.trim();
  const excerpt = escapeTelegramHtml(excerptRaw);

  let text = `<b>Tend.am</b> — <b>նոր առաջարկ</b> ձեր մրցույթին։\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `<b>Անուն</b>՝ ${name}\n`;
  text += `<b>Էլ․ փոստ</b>՝ ${email}\n`;
  text += `<b>Հեռախոս</b>՝ ${phoneLine}\n`;
  text += `<b>Գին</b>՝ ${escapeTelegramHtml(formatAmd(params.priceAmd))}\n`;
  text += `<b>Կատարման ժամկետ</b>՝ ${params.timelineDays} օր\n\n`;
  text += `<i>Ուղեկից նամակ</i>\n${excerpt}`;

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  const plainBody = [
    `Նոր առաջարկ՝ ${params.providerDisplayName}`,
    `Գին՝ ${formatAmd(params.priceAmd)}, ${params.timelineDays} օր`,
    excerptRaw ? `Նամակ՝ ${excerptRaw}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Նոր առաջարկ՝ ${params.tenderTitle}`,
    emailTitle: "Նոր առաջարկ ձեր մրցույթին",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "PENDING",
      kind: NOTIFICATION_KINDS.NEW_BID,
      title: `Նոր առաջարկ՝ ${params.tenderTitle}`,
      body: plainBody,
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}
