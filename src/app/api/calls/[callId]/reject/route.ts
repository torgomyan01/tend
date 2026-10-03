import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCallParticipant } from "@/lib/call-access";
import {
  callMediaLabel,
  postCallSystemMessage,
  serializeCallSession,
} from "@/lib/call-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ callId: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { userId, call } = access;

  if (call.status !== "RINGING") {
    return NextResponse.json(
      { error: "NOT_RINGING", status: call.status },
      { status: 409 },
    );
  }

  const asCallee = userId === call.calleeId;
  const status = asCallee ? "REJECTED" : "CANCELLED";

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: {
      status,
      endedAt: new Date(),
      endReason: asCallee ? "rejected" : "cancelled",
    },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await postCallSystemMessage({
    conversationId: call.conversationId,
    body: asCallee
      ? `${callMediaLabel(call.mediaType)} · մերժված`
      : `${callMediaLabel(call.mediaType)} · չեղարկված`,
  });

  return NextResponse.json({ call: serializeCallSession(updated) });
}
