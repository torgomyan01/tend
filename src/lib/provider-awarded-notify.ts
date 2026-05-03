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

/** Ծանուցում դիմողին՝ ընտրվել է որպես վերջնական կատարող։ */
export async function notifyProviderAwarded(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
}) {
  if (!params.chatId) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Շնորհավորում ենք՝ ընտրվել եք որպես կատարող։</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `Պատվիրատուն ընտրել է ձեզ այս մրցույթի համար։ Կարող եք բացել մրցույթը և շարունակել կապը։`;

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}
