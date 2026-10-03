import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCallParticipant } from "@/lib/call-access";
import {
  callMediaLabel,
  postCallSystemMessage,
} from "@/lib/call-session";
import {
  isAudioMessageMime,
  isVideoMessageMime,
  MESSAGE_MAX_VIDEO_BYTES,
  MESSAGE_MAX_VOICE_BYTES,
  saveMessageUpload,
} from "@/lib/tender-message-upload";
import {
  serializeTenderMessage,
  tenderMessageInclude,
} from "@/lib/tender-messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ callId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { call } = access;

  if (call.recordingMessageId) {
    return NextResponse.json({ error: "ALREADY_SAVED" }, { status: 409 });
  }

  if (
    call.status !== "ENDED" &&
    call.status !== "ACTIVE" &&
    call.status !== "REJECTED"
  ) {
    // Allow upload right as hangup happens (ACTIVE) or after ENDED
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "EMPTY_FILE" }, { status: 400 });
  }

  const isVideo = isVideoMessageMime(file.type);
  const isAudio = isAudioMessageMime(file.type);
  if (!isVideo && !isAudio) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
  }

  const maxBytes = isVideo ? MESSAGE_MAX_VIDEO_BYTES : MESSAGE_MAX_VOICE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", maxBytes },
      { status: 400 },
    );
  }

  let saved;
  try {
    saved = await saveMessageUpload(call.conversationId, file);
  } catch {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
  }

  const label = callMediaLabel(call.mediaType);
  const body = isVideo
    ? `${label} · տեսագրություն`
    : `${label} · ձայնագրություն`;

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.tenderMessage.create({
      data: {
        conversationId: call.conversationId,
        senderUserId: null,
        kind: "SYSTEM_CALL",
        body,
        attachments: {
          create: {
            url: saved.url,
            originalFileName: saved.originalFileName,
            mimeType: saved.mimeType,
            sizeBytes: saved.sizeBytes,
          },
        },
      },
      include: tenderMessageInclude,
    });

    await tx.tenderConversation.update({
      where: { id: call.conversationId },
      data: { lastMessageAt: now },
    });

    await tx.callSession.update({
      where: { id: callId },
      data: { recordingMessageId: created.id },
    });

    return created;
  });

  // Ensure a summary line exists even if hangup raced
  if (call.status === "ACTIVE") {
    try {
      await postCallSystemMessage({
        conversationId: call.conversationId,
        body: `${label} · ավարտված`,
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    message: serializeTenderMessage(message),
  });
}
