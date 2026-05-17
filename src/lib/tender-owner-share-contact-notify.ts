import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

/** Ծանուցում դիմողին՝ պատվիրատուն կիսվել է կապով։ */
export async function notifyProviderOwnerSharedContact(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
  ownerDisplayName: string;
  ownerPhone: string | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const name = escapeTelegramHtml(params.ownerDisplayName);

  let text = `<b>Tend.am</b>\n<b>Պատվիրատուն բացել է իր կապը ձեր առաջարկի համար։</b>\n\n`;
  text += `<b>${title}</b>\n`;
  text += `Պատվիրատու՝ ${name}`;

  if (params.ownerPhone?.trim()) {
    text += `\n<b>Հեռախոս</b>՝ ${escapeTelegramHtml(params.ownerPhone.trim())}`;
  }

  const url = absoluteAppUrl(ROUTES.tenderDetail(params.tenderId));
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Պատվիրատուն կիսվել է կապով՝ ${params.tenderTitle}`,
    emailTitle: "Կապի տվյալներ",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
  });
}
