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

  if (userId !== call.calleeId) {
    return NextResponse.json({ error: "ONLY_CALLEE" }, { status: 403 });
  }
  if (call.status !== "RINGING") {
    return NextResponse.json(
      { error: "NOT_RINGING", status: call.status },
      { status: 409 },
    );
  }

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: {
      status: "ACTIVE",
      startedAt: new Date(),
    },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await postCallSystemMessage({
    conversationId: call.conversationId,
    body: `${callMediaLabel(call.mediaType)} · միացված է`,
  });

  return NextResponse.json({ call: serializeCallSession(updated) });
}
