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

/** Ծանուցում դիմողին՝ առաջարկը հաստատվել է և հասել է պատվիրատուին։ */
export async function notifyProviderBidModerationApproved(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
}) {
  if (!params.chatId) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);

  let text = `<b>Tend.am</b>\n<b>Ձեր առաջարկը հաստատվել է և հաջողությամբ հասել է պատվիրատուին։</b>\n\n`;
  text += `<b>${title}</b>`;

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}
