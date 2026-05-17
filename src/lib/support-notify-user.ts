import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyUserSupportReply(params: {
  userId: string;
  body: string;
  staffName: string | null;
  attachmentNames: string[];
}): Promise<void> {
  const preview = escapeTelegramHtml(
    params.body.trim().slice(0, 500) || "(կցված ֆայլեր)",
  );
  const staff = escapeTelegramHtml(params.staffName?.trim() || "Աջակցություն");
  const homeUrl = absoluteAppUrl(ROUTES.home);

  let text = `<b>Tend.am — Աջակցություն</b>\n\n`;
  text += `<b>Պատասխան</b> (${staff})\n\n`;
  text += `${preview}`;

  if (params.attachmentNames.length > 0) {
    text += `\n\n<b>Ֆայլեր</b>՝ ${escapeTelegramHtml(params.attachmentNames.join(", "))}`;
  }

  if (homeUrl) {
    text += `\n\n<a href="${escapeTelegramHtml(homeUrl)}">Բացել կայքը</a>`;
    text += `\n<i>Ներքև աջում սեղմեք աջակցության կոճակը։</i>`;
  }

  const plainBody = [
    params.body.trim() || "(կցված ֆայլեր)",
    params.attachmentNames.length > 0
      ? `Ֆայլեր՝ ${params.attachmentNames.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyUserById(params.userId, {
    telegramText: text,
    skipTelegram: true,
    emailSubject: "Tend.am — Աջակցությունից պատասխան",
    emailTitle: "Աջակցություն",
    emailPlainText: plainBody,
    ctaLabel: "Բացել կայքը",
    ctaUrl: homeUrl || undefined,
    inApp: {
      category: "INFO",
      kind: NOTIFICATION_KINDS.SUPPORT_REPLY,
      title: "Աջակցությունից պատասխան",
      body: params.body.trim().slice(0, 200) || "Նոր հաղորդագրություն աջակցությունից",
      href: ROUTES.home,
    },
  });
}
