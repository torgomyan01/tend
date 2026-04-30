const DEFAULT_BOT_USERNAME = "tend_am_bot";

export function getTelegramBotUrl(token: string) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? DEFAULT_BOT_USERNAME;

  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to send Telegram message");
  }
}
