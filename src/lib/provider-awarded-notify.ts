import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyProviderAwarded(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
  /** Contract page for escrow details */
  contractId?: string | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const hrefPath = params.contractId
    ? ROUTES.contract(params.contractId)
    : ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(hrefPath);

  let text = `<b>Tend.am</b>\n<b>Շնորհավորում ենք՝ ընտրվել եք որպես կատարող։</b>\n\n`;
  text += `<b>${title}</b>\n\n`;
  text += `Երկու կողմն էլ հաստատել են էլեկտրոնային պայմանագիրը։\n\n`;
  text += `<b>Խնդրում ենք սպասել</b>՝ մինչև պատվիրատուն վճարի գումարը, և Tend.am-ը հաստատի մուտքը (գումարը կպահվի պաշտպանված գործարքով)։\n`;
  text += `Միայն դրանից հետո կարող եք սկսել աշխատանքը։`;

  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել պայմանագիրը / մանրամասները</a>`;
  }

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: `Ընտրվել եք որպես կատարող՝ ${params.tenderTitle}`,
    emailTitle: "Ընտրվել եք որպես կատարող",
    ctaLabel: params.contractId
      ? "Բացել պայմանագիրը"
      : "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED",
      kind: NOTIFICATION_KINDS.PROVIDER_AWARDED,
      title: "Ընտրվել եք որպես կատարող",
      body: `«${params.tenderTitle}» · սպասեք մինչև պատվիրատուն վճարի և գումարը պահվի։ Դրանից հետո կարող եք սկսել աշխատանքը։`,
      href: hrefPath,
      tenderId: params.tenderId,
    },
  });
}
