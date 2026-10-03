import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireConversationParty } from "@/lib/call-access";
import {
  callMediaLabel,
  notifyIncomingCall,
  postCallSystemMessage,
  serializeCallSession,
} from "@/lib/call-session";
import { displayName } from "@/lib/tender-messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  mediaType: z.enum(["AUDIO", "VIDEO"]),
});

export async function GET(_request: Request, context: Ctx) {
  const { id: conversationId } = await context.params;
  const access = await requireConversationParty(conversationId);
  if ("error" in access && access.error) return access.error;

  const call = await prisma.callSession.findFirst({
    where: {
      conversationId,
      status: { in: ["RINGING", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({
    call: call ? serializeCallSession(call) : null,
  });
}

export async function POST(request: Request, context: Ctx) {
  const { id: conversationId } = await context.params;
  const access = await requireConversationParty(conversationId);
  if ("error" in access && access.error) return access.error;
  const { userId, conversation } = access;

  if (conversation.status === "ARCHIVED") {
    return NextResponse.json({ error: "ARCHIVED" }, { status: 409 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const existing = await prisma.callSession.findFirst({
    where: {
      OR: [
        { callerId: userId, status: { in: ["RINGING", "ACTIVE"] } },
        { calleeId: userId, status: { in: ["RINGING", "ACTIVE"] } },
        {
          conversationId,
          status: { in: ["RINGING", "ACTIVE"] },
        },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "CALL_IN_PROGRESS" }, { status: 409 });
  }

  const calleeId =
    userId === conversation.clientId
      ? conversation.providerId
      : conversation.clientId;
  const callerUser =
    userId === conversation.clientId
      ? conversation.client
      : conversation.provider;

  const call = await prisma.callSession.create({
    data: {
      conversationId,
      callerId: userId,
      calleeId,
      mediaType: parsed.data.mediaType,
      status: "RINGING",
    },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await postCallSystemMessage({
    conversationId,
    body: `${callMediaLabel(call.mediaType)} · զանգում է…`,
  });

  try {
    await notifyIncomingCall({
      recipientUserId: calleeId,
      callerName: displayName(callerUser),
      tenderTitle: conversation.tender.title,
      tenderId: conversation.tenderId,
      conversationId,
      mediaType: call.mediaType,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ call: serializeCallSession(call) });
}
