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

/** Telegram ծանուցում բողոք ներկայացնող օգտատիրոջը՝ մոդերացիայի որոշման համար։ */
export async function notifyTenderComplaintReporterDecision(params: {
  chatId: string | null | undefined;
  tenderTitle: string;
  tenderId: string;
  decision: "REVIEWED" | "DISMISSED";
  note?: string | null;
}) {
  if (!params.chatId) {
    return;
  }

  const title = escapeTelegramHtml(params.tenderTitle);

  let text =
    params.decision === "REVIEWED"
      ? `<b>Tend.am</b>\nՁեր բողոքը մոդերատորի կողմից նշված է որպես <b>դիտարկված</b>։\n\n<b>${title}</b>`
      : `<b>Tend.am</b>\nՁեր բողոքը մերժվել է մոդերատորի կողմից։\n\n<b>${title}</b>`;

  if (params.note?.trim()) {
    text += `\n\n<i>Մոդերատորի նշում՝</i> ${escapeTelegramHtml(params.note.trim())}`;
  }

  const url = tenderPublicUrl(params.tenderId);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await trySendTelegramMessage(params.chatId, text);
}
