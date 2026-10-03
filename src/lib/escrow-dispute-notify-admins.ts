import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { formatAmd } from "@/lib/format";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml, trySendTelegramMessage } from "@/lib/telegram";

export async function notifyAdminsEscrowDispute(params: {
  escrowId: string;
  contractId: string;
  tenderId: string;
  tenderTitle: string;
  paymentCode: string;
  amount: number;
  reason: string;
  openedByUserId: string;
  openedByRole: "client" | "provider";
  openedByName: string;
}): Promise<void> {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MODERATOR"] },
      isBlocked: false,
    },
    select: { id: true, telegramChatId: true },
  });

  if (staff.length === 0) return;

  const adminUrl = absoluteAppUrl(ROUTES.admin.disputes);
  const title = escapeTelegramHtml(params.tenderTitle);
  const code = escapeTelegramHtml(params.paymentCode);
  const amountLabel = escapeTelegramHtml(formatAmd(params.amount));
  const reason = escapeTelegramHtml(params.reason);
  const opener = escapeTelegramHtml(params.openedByName);
  const openerRole =
    params.openedByRole === "client" ? "պատվիրատու" : "կատարող";

  let telegramText = `<b>Tend.am — Escrow վեճ</b>\n`;
  telegramText += `<b>Վեճը բացված է</b>\n\n`;
  telegramText += `<b>Մրցույթ</b>՝ ${title}\n`;
  telegramText += `<b>Գումար</b>՝ ${amountLabel}\n`;
  telegramText += `<b>Կոդ</b>՝ <code>${code}</code>\n`;
  telegramText += `<b>Բացել է</b>՝ ${opener} (${openerRole})\n\n`;
  telegramText += `<b>Պատճառ</b>\n${reason}\n\n`;
  telegramText += `Խնդրում ենք քննել վեճը ադմին վահանակից։`;
  if (adminUrl) {
    telegramText += `\n\n<a href="${escapeTelegramHtml(adminUrl)}">Բացել վեճերը</a>`;
  }

  const inAppBody = `«${params.tenderTitle}» · ${formatAmd(params.amount)} · բացել է ${params.openedByName} (${openerRole})։ Պատճառ՝ ${params.reason}`;
  const href = ROUTES.admin.disputes;

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
        emailSubject: `Escrow վեճ բացված է՝ ${params.tenderTitle}`,
        emailTitle: "Escrow վեճ բացված է",
        ctaLabel: "Բացել վեճերը",
        ctaUrl: adminUrl || undefined,
        inApp: {
          category: "PENDING",
          kind: NOTIFICATION_KINDS.ESCROW_DISPUTE,
          title: "Escrow վեճ բացված է",
          body: inAppBody,
          href,
          tenderId: params.tenderId,
        },
      });
    }),
  );
}
