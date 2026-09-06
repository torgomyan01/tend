import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

function resolveHref(tenderId: string, href?: string) {
  return href?.trim() || ROUTES.tenderDetail(tenderId);
}

/** Պատվիրատուն առաջարկել է կատարողին · պայմանագիր գեներացված է */
export async function notifyContractProposedToProvider(params: {
  providerUserId: string;
  tenderTitle: string;
  tenderId: string;
  href?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const path = resolveHref(params.tenderId, params.href);
  const url = absoluteAppUrl(path);

  let text = `<b>Tend.am</b>\n<b>Ձեզ առաջարկել են որպես կատարող</b>\n\n`;
  text += `Պատվիրատուն ձեզ ընտրել է «<b>${title}</b>» մրցույթի համար և գեներացրել է էլեկտրոնային պայմանագիր։\n\n`;
  text += `Հաջորդ քայլեր՝\n`;
  text += `1) Պատվիրատուն հաստատում է պայմանագիրը\n`;
  text += `2) Դուք կստանաք ծանուցում և պետք է հաստատեք նույն տեքստը\n`;
  text += `3) Երկու հաստատումից հետո դուք կհամարվեք ընտրված կատարող`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել զրույցը / պայմանագիրը</a>`;
  }

  await notifyUserById(params.providerUserId, {
    telegramText: text,
    emailSubject: `Ձեզ առաջարկել են որպես կատարող՝ ${params.tenderTitle}`,
    emailTitle: "Պայմանագրի առաջարկ",
    ctaLabel: "Բացել զրույցը",
    ctaUrl: url || undefined,
    inApp: {
      category: "PENDING",
      kind: NOTIFICATION_KINDS.CONTRACT_PROPOSED_TO_PROVIDER,
      title: "Ձեզ առաջարկել են որպես կատարող",
      body: `«${params.tenderTitle}» · սպասեք պատվիրատուի հաստատմանը, ապա հաստատեք պայմանագիրը։`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

/** Պատվիրատուն հաստատել է · հիմա կատարողի հերթն է */
export async function notifyContractAwaitingProvider(params: {
  providerUserId: string;
  tenderTitle: string;
  tenderId: string;
  href?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const path = resolveHref(params.tenderId, params.href);
  const url = absoluteAppUrl(path);

  let text = `<b>Tend.am</b>\n<b>Հաստատեք պայմանագիրը</b>\n\n`;
  text += `Պատվիրատուն արդեն հաստատել է պայմանագիրը «<b>${title}</b>» մրցույթի համար։\n\n`;
  text += `Բացեք պայմանագիրը, կարդացեք տեքստը և սեղմեք «Համաձայն եմ · Հաստատել»՝ որպեսզի պաշտոնապես ընտրվեք որպես կատարող։`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել և հաստատել</a>`;
  }

  await notifyUserById(params.providerUserId, {
    telegramText: text,
    emailSubject: `Հաստատեք պայմանագիրը՝ ${params.tenderTitle}`,
    emailTitle: "Պայմանագիրը սպասում է ձեր հաստատմանը",
    ctaLabel: "Հաստատել պայմանագիրը",
    ctaUrl: url || undefined,
    inApp: {
      category: "PENDING",
      kind: NOTIFICATION_KINDS.CONTRACT_AWAITING_PROVIDER,
      title: "Հաստատեք պայմանագիրը",
      body: `Պատվիրատուն հաստատել է։ Հիմա ձեր հերթն է՝ «${params.tenderTitle}»։`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

/** Երկու կողմն էլ հաստատել են · ծանուցել պատվիրատուին */
export async function notifyContractFullyAcceptedToPatron(params: {
  clientUserId: string;
  tenderTitle: string;
  tenderId: string;
  providerName: string;
  href?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const provider = escapeTelegramHtml(params.providerName);
  const path = resolveHref(params.tenderId, params.href);
  const url = absoluteAppUrl(path);

  let text = `<b>Tend.am</b>\n<b>Պայմանագիրը կնքված է</b>\n\n`;
  text += `Կատարողը (<b>${provider}</b>) հաստատել է պայմանագիրը «<b>${title}</b>» մրցույթի համար։ Կատարողը պաշտոնապես ընտրված է։`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  await notifyUserById(params.clientUserId, {
    telegramText: text,
    emailSubject: `Պայմանագիրը կնքված է՝ ${params.tenderTitle}`,
    emailTitle: "Կատարողը հաստատված է",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED",
      kind: NOTIFICATION_KINDS.CONTRACT_ACCEPTED,
      title: "Պայմանագիրը կնքված է",
      body: `${params.providerName} հաստատել է պայմանագիրը «${params.tenderTitle}» մրցույթի համար։`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

export async function notifyContractCancelled(params: {
  recipientUserId: string;
  tenderTitle: string;
  tenderId: string;
  byPatron: boolean;
  href?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const path = resolveHref(params.tenderId, params.href);
  const url = absoluteAppUrl(path);

  const who = params.byPatron ? "Պատվիրատուն" : "Կատարողը";
  let text = `<b>Tend.am</b>\n<b>Պայմանագրի առաջարկը չեղարկվել է</b>\n\n`;
  text += `${who} չեղարկել է պայմանագիրը «<b>${title}</b>» մրցույթի համար։`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել զրույցը</a>`;
  }

  await notifyUserById(params.recipientUserId, {
    telegramText: text,
    emailSubject: `Պայմանագիրը չեղարկված է՝ ${params.tenderTitle}`,
    emailTitle: "Պայմանագիրը չեղարկված է",
    ctaLabel: "Բացել զրույցը",
    ctaUrl: url || undefined,
    inApp: {
      category: "INFO",
      kind: NOTIFICATION_KINDS.CONTRACT_CANCELLED,
      title: "Պայմանագիրը չեղարկված է",
      body: `${who} չեղարկել է պայմանագիրը «${params.tenderTitle}» մրցույթի համար։`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

export async function notifyContractProposedToPatron(params: {
  clientUserId: string;
  tenderTitle: string;
  tenderId: string;
  href?: string;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const path = resolveHref(params.tenderId, params.href);
  const url = absoluteAppUrl(path);

  let text = `<b>Tend.am</b>\n<b>Պայմանագիրը պատրաստ է</b>\n\n`;
  text += `Գեներացվել է պայմանագիր «<b>${title}</b>» մրցույթի համար։ Կարդացեք և հաստատեք՝ ապա կատարողը կստանա հաստատման հրավեր։`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել պայմանագիրը</a>`;
  }

  await notifyUserById(params.clientUserId, {
    telegramText: text,
    emailSubject: `Հաստատեք պայմանագիրը՝ ${params.tenderTitle}`,
    emailTitle: "Պայմանագիրը պատրաստ է",
    ctaLabel: "Բացել զրույցը",
    ctaUrl: url || undefined,
    inApp: {
      category: "PENDING",
      kind: NOTIFICATION_KINDS.CONTRACT_AWAITING_CLIENT,
      title: "Հաստատեք պայմանագիրը",
      body: `Պայմանագիրը պատրաստ է «${params.tenderTitle}» մրցույթի համար։`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

export async function notifyTenderPeerMessage(params: {
  recipientUserId: string;
  senderName: string;
  tenderTitle: string;
  tenderId: string;
  conversationId: string;
  preview: string;
}) {
  const path = ROUTES.messageThread(params.conversationId);
  const url = absoluteAppUrl(path);
  const title = escapeTelegramHtml(params.tenderTitle);
  const sender = escapeTelegramHtml(params.senderName);
  const preview = escapeTelegramHtml(params.preview.slice(0, 160));

  let text = `<b>Tend.am</b>\n<b>Նոր հաղորդագրություն</b>\n\n`;
  text += `<b>${sender}</b> · «<b>${title}</b>»\n`;
  text += preview;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել զրույցը</a>`;
  }

  await notifyUserById(params.recipientUserId, {
    telegramText: text,
    emailSubject: `Նոր հաղորդագրություն՝ ${params.tenderTitle}`,
    emailTitle: "Նոր հաղորդագրություն",
    ctaLabel: "Բացել զրույցը",
    ctaUrl: url || undefined,
    inApp: {
      category: "INFO",
      kind: NOTIFICATION_KINDS.TENDER_PEER_MESSAGE,
      title: "Նոր հաղորդագրություն",
      body: `${params.senderName} · «${params.tenderTitle}»՝ ${params.preview.slice(0, 120)}`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}
