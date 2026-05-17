import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

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

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  const bodyLines = [
    `Պատվիրատու՝ ${params.ownerDisplayName}`,
    params.ownerPhone?.trim() ? `Հեռախոս՝ ${params.ownerPhone.trim()}` : null,
  ].filter(Boolean) as string[];

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Պատվիրատուն կիսվել է կապով՝ ${params.tenderTitle}`,
    emailTitle: "Կապի տվյալներ",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED",
      kind: NOTIFICATION_KINDS.OWNER_SHARED_CONTACT,
      title: "Պատվիրատուն բացել է կապը",
      body: bodyLines.join("\n"),
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}
