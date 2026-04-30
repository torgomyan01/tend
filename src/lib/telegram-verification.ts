import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
    };
  };
};

type TelegramUpdatesResponse = {
  ok: boolean;
  result?: TelegramUpdate[];
};

function getStartToken(text?: string) {
  if (!text?.startsWith("/start")) {
    return null;
  }

  const [, token] = text.trim().split(/\s+/);

  return token ?? null;
}

export async function processTelegramUpdate(update: TelegramUpdate) {
  const chatId = update.message?.chat?.id?.toString();
  const startToken = getStartToken(update.message?.text);

  if (!chatId) {
    return;
  }

  if (!startToken) {
    await sendTelegramMessage(
      chatId,
      "Բարև։ Գրանցումը ավարտելու համար բացեք Tend.am-ի գրանցման էջը և սեղմեք Telegram վերիֆիկացիայի կոճակը։",
    );

    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      telegramLinkToken: startToken,
      telegramLinkTokenExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!user) {
    await sendTelegramMessage(
      chatId,
      "Վերիֆիկացիայի հղումը անվավեր է կամ ժամկետանց։ Խնդրում ենք նորից փորձել գրանցման էջից։",
    );

    return;
  }

  const alreadyLinkedUser = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      NOT: {
        id: user.id,
      },
    },
    select: { id: true },
  });

  if (alreadyLinkedUser) {
    await sendTelegramMessage(
      chatId,
      "Այս Telegram հաշիվն արդեն կապված է Tend.am-ի այլ հաշվի հետ։",
    );

    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      telegramVerifiedAt: new Date(),
      telegramLinkToken: null,
      telegramLinkTokenExpiresAt: null,
    },
  });

  await sendTelegramMessage(
    chatId,
    `Շնորհավորում ենք${user.name ? `, ${user.name}` : ""}։ Ձեր Tend.am հաշիվը վերիֆիկացվեց Telegram-ով։`,
  );
}

export async function processPendingTelegramUpdates() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates?limit=100&allowed_updates=${encodeURIComponent(
      JSON.stringify(["message"]),
    )}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return;
  }

  const data = (await response.json()) as TelegramUpdatesResponse;
  const updates = data.result ?? [];
  let lastUpdateId: number | null = null;

  for (const update of updates) {
    if (typeof update.update_id === "number") {
      lastUpdateId = Math.max(lastUpdateId ?? update.update_id, update.update_id);
    }

    await processTelegramUpdate(update);
  }

  if (lastUpdateId !== null) {
    await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?offset=${
        lastUpdateId + 1
      }&limit=1`,
      { cache: "no-store" },
    );
  }
}
