import { tenderReviewUrlForNotify } from "@/lib/absolute-app-url";
import {
  escapeTelegramHtml,
  trySendTelegramMessage,
  type TelegramSendOptions,
} from "@/lib/telegram";

/** Telegram URL կոճակի համար պարտադիր է http/https։ */
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
  /** Եթե false՝ URL-ը տեքստում չենք դնում (կա ներքևի URL կոճակ)։ */
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

/** Մրցույթը COMPLETED — Telegram երկու կողմին։ */
export async function notifyPartiesTenderWorkCompleted(params: {
  tenderTitle: string;
  tenderId: string;
  providerChatId: string | null | undefined;
  clientChatId: string | null | undefined;
  /** Կանչող բրաուզերի հասցեն (localhost vs live դոմեն)՝ հղման համար։ */
  request?: Request | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const urlRaw = tenderReviewUrlForNotify(params.tenderId, params.request ?? null);

  if (!urlRaw && process.env.NODE_ENV === "production") {
    console.warn(
      "[notifyPartiesTenderWorkCompleted] Հանրային URL չկա։ Սահմանեք NEXT_PUBLIC_APP_URL կամ NEXTAUTH_URL (կամ production-ում VERCEL_URL)՝ Telegram հղումների համար։",
    );
  }

  const useUrlButton = Boolean(urlRaw && canTelegramUrlButton(urlRaw));
  const msgOpts = reviewCompletedReplyMarkup(urlRaw);

  const toProvider = buildCompletedNotifyMessage({
    tenderTitleEscaped: title,
    bodyParagraph:
      "Պատվիրատուն փակել է մրցույթը։ Կարող եք գնահատել միայն պատվիրատուին, ում հետ այս մրցույթով աշխատել եք՝ բացելով կայքը վերևի հղումով։",
    urlRaw,
    includeUrlInMessageBody: !useUrlButton,
  });

  const toClient = buildCompletedNotifyMessage({
    tenderTitleEscaped: title,
    bodyParagraph:
      "Դուք փակել եք մրցույթը։ Կարող եք գնահատել միայն ընտրված կատարողին, ում հետ այս մրցույթով աշխատել եք՝ բացելով կայքը վերևի հղումով։",
    urlRaw,
    includeUrlInMessageBody: !useUrlButton,
  });

  await Promise.all([
    params.providerChatId
      ? trySendTelegramMessage(params.providerChatId, toProvider, msgOpts)
      : Promise.resolve(false),
    params.clientChatId
      ? trySendTelegramMessage(params.clientChatId, toClient, msgOpts)
      : Promise.resolve(false),
  ]);
}
