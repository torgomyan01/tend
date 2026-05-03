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

/** Ծանուցում դիմողին՝ պատվիրատուն կիսվել է կապով։ */
export async function notifyProviderOwnerSharedContact(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
  ownerDisplayName: string;
  ownerPhone: string | null;
}) {
  if (!params.chatId) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);
  const name = escapeTelegramHtml(params.ownerDisplayName);

  let text = `<b>Tend.am</b>\n<b>Պատվիրատուն բացել է իր կապը ձեր առաջարկի համար։</b>\n\n`;
  text += `<b>${title}</b>\n`;
  text += `Պատվիրատու՝ ${name}`;

  if (params.ownerPhone?.trim()) {
    text += `\n<b>Հեռախոս</b>՝ ${escapeTelegramHtml(params.ownerPhone.trim())}`;
  }

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}
