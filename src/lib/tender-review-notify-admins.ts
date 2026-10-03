import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";

/**
 * Նոր մրցույթ մտել է REVIEW · ծանուցել ADMIN/MODERATOR աշխատակիցներին,
 * որպեսզի հնարավորինս արագ հաստատեն։
 */
export async function notifyAdminsTenderAwaitingReview(params: {
  tenderId: string;
  tenderTitle: string;
  category: string;
  service: string;
  city: string | null;
  clientName: string;
  clientEmail: string;
}): Promise<void> {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MODERATOR"] },
      isBlocked: false,
    },
    select: { id: true, telegramChatId: true },
  });

  if (staff.length === 0) return;

  const adminUrl = absoluteAppUrl(
    `${ROUTES.admin.tenders}?status=REVIEW`,
  );
  const title = escapeTelegramHtml(params.tenderTitle);
  const category = escapeTelegramHtml(params.category);
  const service = escapeTelegramHtml(params.service);
  const city = params.city?.trim()
    ? escapeTelegramHtml(params.city.trim())
    : "—";
  const client = escapeTelegramHtml(
    params.clientName.trim() || params.clientEmail,
  );
  const email = escapeTelegramHtml(params.clientEmail);

  let telegramText = `<b>Tend.am — Մրցույթի մոդերացիա</b>\n`;
  telegramText += `<b>Նոր մրցույթ սպասում է հաստատման</b>\n\n`;
  telegramText += `<b>Վերնագիր</b>՝ ${title}\n`;
  telegramText += `<b>Ոլորտ</b>՝ ${category} · ${service}\n`;
  telegramText += `<b>Քաղաք</b>՝ ${city}\n`;
  telegramText += `<b>Պատվիրատու</b>՝ ${client}\n`;
  telegramText += `<b>Email</b>՝ ${email}\n\n`;
  telegramText += `Խնդրում ենք հնարավորինս շուտ ստուգել և հաստատել։`;
  if (adminUrl) {
    telegramText += `\n\n<a href="${escapeTelegramHtml(adminUrl)}">Բացել մոդերացիան</a>`;
  }

  const href = `${ROUTES.admin.tenders}?status=REVIEW`;
  const inAppBody = `«${params.tenderTitle}» · ${params.category} · ${params.clientName.trim() || params.clientEmail}`;

  const seenTelegram = new Set<string>();
  await Promise.allSettled(
    staff.map(async (user) => {
      const chatId = user.telegramChatId?.trim();
      if (chatId && !seenTelegram.has(chatId)) {
        seenTelegram.add(chatId);
        await trySendTelegramMessage(chatId, telegramText);
      }

      await notifyUserById(user.id, {
        telegramText,
        skipTelegram: true,
        emailSubject: `Նոր մրցույթ մոդերացիայի համար՝ ${params.tenderTitle}`,
        emailTitle: "Նոր մրցույթ սպասում է հաստատման",
        ctaLabel: "Բացել մոդերացիան",
        ctaUrl: adminUrl || undefined,
        inApp: {
          category: "PENDING",
          kind: NOTIFICATION_KINDS.TENDER_AWAITING_REVIEW,
          title: "Նոր մրցույթ սպասում է հաստատման",
          body: inAppBody,
          href,
          tenderId: params.tenderId,
        },
      });
    }),
  );
}
