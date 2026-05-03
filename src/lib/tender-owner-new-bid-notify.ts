import { formatAmd } from "@/lib/format";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";

function tenderPublicUrl(tenderId: string) {
  const base =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!base) {
    return "";
  }

  return `${base.replace(/\/$/, "")}/tenders/${tenderId}`;
}

export async function notifyTenderOwnerNewBid(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
  providerDisplayName: string;
  providerEmail: string;
  providerPhone: string | null;
  priceAmd: number;
  timelineDays: number;
  coverLetter: string;
}) {
  if (!params.chatId) {
    return;
  }

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

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}
