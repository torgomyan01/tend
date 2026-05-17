import { prisma } from "@/lib/prisma";
import {
  formatArmenianPhoneDisplay,
  maskArmenianPhone,
  normalizeArmenianPhone,
  phonesMatch,
} from "@/lib/phone";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramMessage = {
  text?: string;
  contact?: {
    phone_number?: string;
    user_id?: number;
  };
  chat?: {
    id?: number | string;
  };
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
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

function extractPhoneFromMessage(message?: TelegramMessage): string | null {
  if (!message) {
    return null;
  }

  if (message.contact?.phone_number) {
    return normalizeArmenianPhone(message.contact.phone_number);
  }

  if (message.text && !message.text.startsWith("/")) {
    return normalizeArmenianPhone(message.text);
  }

  return null;
}

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: "Կիսվել հեռախոսահամարով", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

async function sendPhonePrompt(
  chatId: string,
  registeredPhone: string,
  name: string | null,
) {
  const display = formatArmenianPhoneDisplay(registeredPhone);
  const masked = maskArmenianPhone(registeredPhone);
  const greeting = name ? `, ${name}` : "";

  await sendTelegramMessage(
    chatId,
    [
      `Բարև${greeting}։`,
      "",
      `Tend.am-ում գրանցված հեռախոսահամարն է՝ <b>${display}</b>։`,
      "",
      "Հաստատեք հաշիվը՝ ուղարկելով <b>նույն</b> համարը.",
      "• Սեղմեք «Կիսվել հեռախոսահամարով», կամ",
      `• Գրեք ձեռքով, օրինակ՝ <code>${display}</code>`,
      "",
      `Մենք սպասում ենք հենց այս համարին (${masked})։`,
    ].join("\n"),
    { replyMarkup: CONTACT_KEYBOARD },
  );
}

async function assertTelegramNotLinkedToOtherUser(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const other = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      telegramVerifiedAt: { not: null },
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (other) {
    await sendTelegramMessage(
      chatId,
      "Այս Telegram հաշիվն արդեն կապված է Tend.am-ի այլ հաշվի հետ։",
      { replyMarkup: { remove_keyboard: true } },
    );
    return false;
  }

  return true;
}

async function assertPhoneNotTakenByOtherUser(
  chatId: string,
  phone: string,
  userId: string,
): Promise<boolean> {
  const normalized = normalizeArmenianPhone(phone);
  if (!normalized) {
    return false;
  }

  const candidates = await prisma.user.findMany({
    where: {
      phone: { not: null },
      NOT: { id: userId },
    },
    select: { id: true, phone: true, telegramVerifiedAt: true },
    take: 200,
  });

  const taken = candidates.some(
    (row) => row.phone && phonesMatch(row.phone, normalized),
  );

  if (taken) {
    await sendTelegramMessage(
      chatId,
      "Այս հեռախոսահամարն արդեն գրանցված է Tend.am-ում։ Եթե դա ձեր հաշիվն է, մուտք գործեք կայքից։",
      { replyMarkup: CONTACT_KEYBOARD },
    );
    return false;
  }

  return true;
}

async function completeTelegramPhoneVerification(
  userId: string,
  chatId: string,
  name: string | null,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: chatId,
      telegramVerifiedAt: new Date(),
      telegramLinkToken: null,
      telegramLinkTokenExpiresAt: null,
      verificationChannel: "TELEGRAM",
    },
  });

  await sendTelegramMessage(
    chatId,
    [
      `Շնորհավորում ենք${name ? `, ${name}` : ""}։`,
      "Ձեր Tend.am հաշիվը հաստատված է Telegram-ով։",
      "Կարող եք վերադառնալ կայք և մուտք գործել։",
    ].join("\n"),
    { replyMarkup: { remove_keyboard: true } },
  );
}

async function handleStartLink(chatId: string, startToken: string) {
  const user = await prisma.user.findFirst({
    where: {
      telegramLinkToken: startToken,
      telegramLinkTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      telegramVerifiedAt: true,
    },
  });

  if (!user?.phone) {
    await sendTelegramMessage(
      chatId,
      "Վերիֆիկացիայի հղումը անվավեր է կամ ժամկետանց է։ Խնդրում ենք նորից փորձել Tend.am-ի գրանցման կամ մուտքի էջից։",
    );
    return;
  }

  if (user.telegramVerifiedAt) {
    await sendTelegramMessage(
      chatId,
      "Ձեր հաշիվն արդեն Telegram-ով հաստատված է։ Կարող եք մուտք գործել Tend.am-ում։",
      { replyMarkup: { remove_keyboard: true } },
    );
    return;
  }

  if (!(await assertTelegramNotLinkedToOtherUser(chatId, user.id))) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId },
  });

  await sendPhonePrompt(chatId, user.phone, user.name);
}

async function handlePhoneSubmission(chatId: string, submittedPhone: string) {
  const user = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      telegramVerifiedAt: null,
      phone: { not: null },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  if (!user?.phone) {
    await sendTelegramMessage(
      chatId,
      "Գրանցումը ավարտելու համար բացեք Tend.am-ի գրանցման էջը, ստեղծեք հաշիվ և սեղմեք Telegram վերիֆիկացիայի կոճակը։",
    );
    return;
  }

  const normalizedSubmitted = normalizeArmenianPhone(submittedPhone);
  if (!normalizedSubmitted) {
    await sendTelegramMessage(
      chatId,
      [
        "Հեռախոսահամարը ճիշտ չէ։",
        "Օգտագործեք հայկական ձևաչափը՝ <code>+374 77 123 456</code>",
        "կամ սեղմեք «Կիսվել հեռախոսահամարով»։",
      ].join("\n"),
      { replyMarkup: CONTACT_KEYBOARD },
    );
    return;
  }

  if (!(await assertPhoneNotTakenByOtherUser(chatId, normalizedSubmitted, user.id))) {
    return;
  }

  if (!phonesMatch(user.phone, normalizedSubmitted)) {
    const expected = formatArmenianPhoneDisplay(user.phone);
    await sendTelegramMessage(
      chatId,
      [
        "Ուղարկված համարը չի համընկնում գրանցման ժամանակ նշված հեռախոսահամարի հետ։",
        `Պետք է ուղարկեք՝ <b>${expected}</b>`,
        "",
        "Եթե սխալ եք գրել կայքում, խմբագրեք հեռախոսը հաշվի կարգավորումներում և նորից փորձեք։",
      ].join("\n"),
      { replyMarkup: CONTACT_KEYBOARD },
    );
    return;
  }

  await completeTelegramPhoneVerification(user.id, chatId, user.name);
}

export async function processTelegramUpdate(update: TelegramUpdate) {
  const chatId = update.message?.chat?.id?.toString();
  if (!chatId) {
    return;
  }

  const startToken = getStartToken(update.message?.text);
  const submittedPhone = extractPhoneFromMessage(update.message);

  if (startToken) {
    await handleStartLink(chatId, startToken);
    return;
  }

  if (submittedPhone) {
    await handlePhoneSubmission(chatId, submittedPhone);
    return;
  }

  if (update.message?.text?.startsWith("/start")) {
    const pending = await prisma.user.findFirst({
      where: {
        telegramChatId: chatId,
        telegramVerifiedAt: null,
        phone: { not: null },
      },
      select: { phone: true, name: true },
    });

    if (pending?.phone) {
      await sendPhonePrompt(chatId, pending.phone, pending.name);
      return;
    }
  }

  await sendTelegramMessage(
    chatId,
    "Բարև։ Tend.am-ում գրանցվելու կամ մուտք գործելուց հետո բացեք Telegram վերիֆիկացիայի հղումը և սեղմեք Start։",
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
