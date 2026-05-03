const DEFAULT_BOT_USERNAME = "tend_am_bot";

/** Minimal escaping for Telegram HTML parse mode. */
export function escapeTelegramHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline keyboard — URL կոճակներ (մինչև 8 շարք, տողում մինչև 8 կոճակ)։ */
export type TelegramSendOptions = {
  replyMarkup?: {
    inline_keyboard: { text: string; url: string }[][];
  };
};

export async function trySendTelegramMessage(
  chatId: string,
  text: string,
  options?: TelegramSendOptions,
): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    await sendTelegramMessage(chatId, text, options);
    return true;
  } catch {
    return false;
  }
}

export function getTelegramBotUrl(token: string) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? DEFAULT_BOT_USERNAME;

  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: TelegramSendOptions,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (options?.replyMarkup?.inline_keyboard?.length) {
    payload.reply_markup = options.replyMarkup;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to send Telegram message");
  }
}
