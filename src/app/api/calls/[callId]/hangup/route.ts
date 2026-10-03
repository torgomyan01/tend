import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCallParticipant } from "@/lib/call-access";
import {
  callMediaLabel,
  formatCallDuration,
  postCallSystemMessage,
  serializeCallSession,
} from "@/lib/call-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ callId: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { call } = access;

  if (call.status === "ENDED" || call.status === "REJECTED" || call.status === "CANCELLED" || call.status === "MISSED") {
    return NextResponse.json({ call: serializeCallSession(call) });
  }

  const now = new Date();
  const wasRinging = call.status === "RINGING";
  const startedAt = call.startedAt;
  const durationSec =
    startedAt && !wasRinging
      ? Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000))
      : 0;

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: {
      status: wasRinging ? "CANCELLED" : "ENDED",
      endedAt: now,
      endReason: wasRinging ? "cancelled" : "hangup",
    },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const label = callMediaLabel(call.mediaType);
  await postCallSystemMessage({
    conversationId: call.conversationId,
    body: wasRinging
      ? `${label} · չեղարկված`
      : `${label} · ${formatCallDuration(durationSec)}`,
  });

  return NextResponse.json({
    call: serializeCallSession(updated),
    durationSec,
  });
}
