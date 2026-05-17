import { tenderReviewUrlForNotify } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import {
  escapeTelegramHtml,
  type TelegramSendOptions,
} from "@/lib/telegram";

function canTelegramUrlButton(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function reviewCompletedReplyMarkup(urlRaw: string): TelegramSendOptions | undefined {
  if (!canTelegramUrlButton(urlRaw)) {
    return undefined;
  }
  return {
    replyMarkup: {
      inline_keyboard: [
        [{ text: "Գնահատման էջ", url: urlRaw.trim() }],
      ],
    },
  };
}

function buildCompletedNotifyMessage(params: {
  tenderTitleEscaped: string;
  bodyParagraph: string;
  urlRaw: string;
  includeUrlInMessageBody: boolean;
}): string {
  const lines: string[] = [
    `<b>Tend.am</b>`,
    `<b>Աշխատանքը հաջողությամբ ավարտված է։</b>`,
    "",
    `<b>${params.tenderTitleEscaped}</b>`,
    "",
    params.bodyParagraph,
    "",
    `Հղումը`,
  ];
  if (params.includeUrlInMessageBody && params.urlRaw) {
    lines.push(`<b>${escapeTelegramHtml(params.urlRaw)}</b>`);
  }
  return lines.join("\n");
}

export async function notifyPartiesTenderWorkCompleted(params: {
  tenderTitle: string;
  tenderId: string;
  providerUserId: string;
  clientUserId: string;
  request?: Request | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const urlRaw = tenderReviewUrlForNotify(params.tenderId, params.request ?? null);
  const reviewPath = ROUTES.tenderReview(params.tenderId);

  if (!urlRaw && process.env.NODE_ENV === "production") {
    console.warn(
      "[notifyPartiesTenderWorkCompleted] Հանրային URL չկա։ Սահմանեք NEXT_PUBLIC_APP_URL կամ NEXTAUTH_URL (կամ production-ում VERCEL_URL)՝ Telegram հղումների համար։",
    );
  }

  const useUrlButton = Boolean(urlRaw && canTelegramUrlButton(urlRaw));
  const msgOpts = reviewCompletedReplyMarkup(urlRaw);

  const providerParagraph =
    "Պատվիրատուն փակել է մրցույթը։ Կարող եք գնահատել միայն պատվիրատուին, ում հետ այս մրցույթով աշխատել եք։";
  const clientParagraph =
    "Դուք փակել եք մրցույթը։ Կարող եք գնահատել միայն ընտրված կատարողին, ում հետ այս մրցույթով աշխատել եք։";

  const toProvider = buildCompletedNotifyMessage({
    tenderTitleEscaped: title,
    bodyParagraph: providerParagraph,
    urlRaw,
    includeUrlInMessageBody: !useUrlButton,
  });

  const toClient = buildCompletedNotifyMessage({
    tenderTitleEscaped: title,
    bodyParagraph: clientParagraph,
    urlRaw,
    includeUrlInMessageBody: !useUrlButton,
  });

  const payloadBase = {
    emailSubject: `Աշխատանքն ավարտված է՝ ${params.tenderTitle}`,
    emailTitle: "Մրցույթն ավարտված է",
    ctaLabel: "Գնահատման էջ",
    ctaUrl: urlRaw || undefined,
    telegramOptions: msgOpts,
  };

  await Promise.all([
    notifyUserById(params.providerUserId, {
      ...payloadBase,
      telegramText: toProvider,
      inApp: {
        category: "INFO",
        kind: NOTIFICATION_KINDS.TENDER_COMPLETED,
        title: "Աշխատանքն ավարտված է",
        body: `${providerParagraph} «${params.tenderTitle}»`,
        href: reviewPath,
        tenderId: params.tenderId,
      },
    }),
    notifyUserById(params.clientUserId, {
      ...payloadBase,
      telegramText: toClient,
      inApp: {
        category: "INFO",
        kind: NOTIFICATION_KINDS.TENDER_COMPLETED,
        title: "Աշխատանքն ավարտված է",
        body: `${clientParagraph} «${params.tenderTitle}»`,
        href: reviewPath,
        tenderId: params.tenderId,
      },
    }),
  ]);
}
