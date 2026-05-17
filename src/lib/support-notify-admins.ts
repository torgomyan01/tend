import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";

export async function notifyAdminsNewSupportMessage(params: {
  fromUserId: string;
  fromUserName: string | null;
  fromUserEmail: string;
  fromUserPhone: string | null;
  body: string;
  attachmentNames: string[];
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MODERATOR"] },
      telegramChatId: { not: null },
      isBlocked: false,
    },
    select: { telegramChatId: true },
  });

  if (admins.length === 0) {
    return;
  }

  const adminUrl = absoluteAppUrl(
    `${ROUTES.admin.support}?user=${encodeURIComponent(params.fromUserId)}`,
  );
  const name = escapeTelegramHtml(
    params.fromUserName?.trim() || params.fromUserEmail,
  );
  const email = escapeTelegramHtml(params.fromUserEmail);
  const phone = params.fromUserPhone?.trim()
    ? escapeTelegramHtml(params.fromUserPhone.trim())
    : "—";
  const body = escapeTelegramHtml(params.body.trim() || "(կցված ֆայլեր)");
  const files =
    params.attachmentNames.length > 0
      ? escapeTelegramHtml(params.attachmentNames.join(", "))
      : "—";

  let text = `<b>Tend.am — Աջակցություն</b>\n`;
  text += `<b>Նոր հաղորդագրություն</b>\n\n`;
  text += `<b>Օգտատեր</b>՝ ${name}\n`;
  text += `<b>Email</b>՝ ${email}\n`;
  text += `<b>Հեռախոս</b>՝ ${phone}\n\n`;
  text += `<b>Հաղորդագրություն</b>\n${body}\n\n`;
  if (params.attachmentNames.length > 0) {
    text += `<b>Ֆայլեր</b>՝ ${files}\n\n`;
  }
  text += `Խնդրում ենք պատասխանել ադմին վահանակից։`;
  if (adminUrl) {
    text += `\n\n<a href="${escapeTelegramHtml(adminUrl)}">Բացել աջակցությունը</a>`;
  }

  const seen = new Set<string>();
  for (const admin of admins) {
    const chatId = admin.telegramChatId;
    if (!chatId || seen.has(chatId)) continue;
    seen.add(chatId);
    await trySendTelegramMessage(chatId, text);
  }
}
