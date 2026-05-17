import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import {
  escapeTelegramHtml,
  type TelegramSendOptions,
} from "@/lib/telegram";

/** Telegram URL կոճակի համար պարտադիր է http/https։ */
function canTelegramUrlButton(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Մրցույթը հրապարակվելուց հետո (ACTIVE) — ծանուցումներ
 * ոլորտում (category) գրանցված հետաքրքրություն ունեցող մասնակիցներին։
 */
export async function notifyInterestedUsersNewPublishedTender(params: {
  tenderId: string;
  tenderTitle: string;
  publisherUserId: string;
}): Promise<void> {
  const tender = await prisma.tender.findUnique({
    where: { id: params.tenderId },
    select: {
      category: true,
      selectedServices: { select: { category: true } },
    },
  });

  if (!tender) {
    return;
  }

  const categories = new Set<string>([tender.category]);
  for (const s of tender.selectedServices) {
    categories.add(s.category);
  }

  const categoryList = [...categories].filter(Boolean);
  if (categoryList.length === 0) {
    return;
  }

  const recipients = await prisma.userInterest.findMany({
    where: {
      category: { in: categoryList },
      userId: { not: params.publisherUserId },
      user: {
        isBlocked: false,
        OR: [
          { telegramChatId: { not: null } },
          { emailVerified: { not: null } },
        ],
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const tenderUrl = absoluteAppUrl(tenderPath);

  const buttonMarkup: TelegramSendOptions | undefined = canTelegramUrlButton(
    tenderUrl,
  )
    ? {
        replyMarkup: {
          inline_keyboard: [
            [{ text: "Բացել մրցույթը", url: tenderUrl.trim() }],
          ],
        },
      }
    : undefined;

  const titleEsc = escapeTelegramHtml(params.tenderTitle);
  const urlEsc = escapeTelegramHtml(tenderUrl.trim());

  let text = `<b>Tend.am</b> — <b>Նոր մրցույթ ձեր ոլորտում</b>\n\n`;
  text +=
    "Հրապարակվել է նոր մրցույթ։ Շտապեք ծանոթանալ մանրամասներին և դիմել։\n\n";
  text += `<b>${titleEsc}</b>`;

  if (buttonMarkup) {
    text += `\n\n<a href="${urlEsc}">Բացել մրցույթը</a>`;
  }

  const seen = new Set<string>();
  for (const row of recipients) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    await notifyUserById(row.userId, {
      telegramText: text,
      telegramOptions: buttonMarkup,
      emailSubject: `Նոր մրցույթ ձեր ոլորտում՝ ${params.tenderTitle}`,
      emailTitle: "Նոր մրցույթ",
      ctaLabel: "Բացել մրցույթը",
      ctaUrl: tenderUrl || undefined,
    });
  }
}
