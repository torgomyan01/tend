import { prisma } from "@/lib/prisma";
import type { CallMediaType, CallStatus } from "@/generated/prisma/client";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";
import { displayName } from "@/lib/tender-messages";

export { formatCallClock as formatCallDuration } from "@/lib/call-constants";

export function callMediaLabel(mediaType: CallMediaType): string {
  return mediaType === "VIDEO" ? "Տեսազանգ" : "Ձայնային զանգ";
}

export async function postCallSystemMessage(params: {
  conversationId: string;
  body: string;
}): Promise<string> {
  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.tenderMessage.create({
      data: {
        conversationId: params.conversationId,
        senderUserId: null,
        kind: "SYSTEM_CALL",
        body: params.body,
      },
      select: { id: true },
    });
    await tx.tenderConversation.update({
      where: { id: params.conversationId },
      data: { lastMessageAt: now },
    });
    return created;
  });
  return message.id;
}

export async function notifyIncomingCall(params: {
  recipientUserId: string;
  callerName: string;
  tenderTitle: string;
  tenderId: string;
  conversationId: string;
  mediaType: CallMediaType;
}) {
  const path = ROUTES.messageThread(params.conversationId);
  const url = absoluteAppUrl(path);
  const label = callMediaLabel(params.mediaType);
  const title = escapeTelegramHtml(params.tenderTitle);
  const caller = escapeTelegramHtml(params.callerName);

  let text = `<b>Tend.am</b>\n<b>Մուտքային ${escapeTelegramHtml(label)}</b>\n\n`;
  text += `<b>${caller}</b> · «<b>${title}</b>»\n`;
  text += `Բացեք զրույցը՝ պատասխանելու համար։`;
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել զրույցը</a>`;
  }

  await notifyUserById(params.recipientUserId, {
    telegramText: text,
    emailSubject: `${label}՝ ${params.tenderTitle}`,
    emailTitle: `Մուտքային ${label}`,
    ctaLabel: "Բացել զրույցը",
    ctaUrl: url || undefined,
    inApp: {
      category: "PENDING",
      kind: NOTIFICATION_KINDS.INCOMING_CALL,
      title: `Մուտքային ${label}`,
      body: `${params.callerName} · «${params.tenderTitle}»`,
      href: path,
      tenderId: params.tenderId,
    },
  });
}

export function serializeCallSession(call: {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mediaType: CallMediaType;
  status: CallStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  endReason: string | null;
  createdAt: Date;
  caller?: { id: string; name: string | null; email: string; image: string | null };
  callee?: { id: string; name: string | null; email: string; image: string | null };
}) {
  return {
    id: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    calleeId: call.calleeId,
    mediaType: call.mediaType,
    status: call.status,
    startedAt: call.startedAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    endReason: call.endReason,
    createdAt: call.createdAt.toISOString(),
    caller: call.caller
      ? {
          id: call.caller.id,
          name: displayName(call.caller),
          image: call.caller.image,
        }
      : null,
    callee: call.callee
      ? {
          id: call.callee.id,
          name: displayName(call.callee),
          image: call.callee.image,
        }
      : null,
  };
}

export async function markMissedIfStillRinging(callId: string): Promise<void> {
  const call = await prisma.callSession.findUnique({
    where: { id: callId },
    select: {
      id: true,
      status: true,
      conversationId: true,
      mediaType: true,
      createdAt: true,
    },
  });
  if (!call || call.status !== "RINGING") return;

  // Auto-miss after 60s of ringing
  if (Date.now() - call.createdAt.getTime() < 60_000) return;

  await prisma.callSession.update({
    where: { id: call.id },
    data: {
      status: "MISSED",
      endedAt: new Date(),
      endReason: "timeout",
    },
  });
  await postCallSystemMessage({
    conversationId: call.conversationId,
    body: `${callMediaLabel(call.mediaType)} · չպատասխանված`,
  });
}
