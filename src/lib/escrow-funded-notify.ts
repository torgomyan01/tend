import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { formatAmd } from "@/lib/format";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyEscrowFunded(params: {
  clientId: string;
  providerId: string;
  tenderId: string;
  tenderTitle: string;
  contractId: string;
  amount: number;
  paymentCode: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const hrefPath = ROUTES.contract(params.contractId);
  const url = absoluteAppUrl(hrefPath);
  const amountLabel = formatAmd(params.amount);
  const code = escapeTelegramHtml(params.paymentCode);

  let text = `<b>Tend.am</b>\n<b>Փոխանցումը հաստատված է</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `Պատվիրատուի փոխանցումը կատարված է և <b>հաստատված է ադմինի կողմից</b>։\n`;
  text += `Գումար՝ <b>${escapeTelegramHtml(amountLabel)}</b>\n`;
  text += `Կոդ՝ <code>${code}</code>\n\n`;
  text += `Այժմ կողմերը կարող եք սկսել համագործակցությունը։`;

  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել պայմանագիրը</a>`;
  }

  const inAppBody = `«${params.tenderTitle}» · փոխանցումը հաստատված է ադմինի կողմից (${amountLabel})։ Այժմ կարող եք սկսել համագործակցությունը։`;

  const payload = {
    telegramText: text,
    emailSubject: `Փոխանցումը հաստատված է՝ ${params.tenderTitle}`,
    emailTitle: "Փոխանցումը հաստատված է",
    ctaLabel: "Բացել պայմանագիրը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED" as const,
      kind: NOTIFICATION_KINDS.ESCROW_FUNDED,
      title: "Փոխանցումը հաստատված է",
      body: inAppBody,
      href: hrefPath,
      tenderId: params.tenderId,
    },
  };

  await Promise.allSettled([
    notifyUserById(params.clientId, payload),
    notifyUserById(params.providerId, payload),
  ]);
}
