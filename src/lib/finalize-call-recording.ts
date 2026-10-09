import { prisma } from "@/lib/prisma";
import { callMediaLabel } from "@/lib/call-session";
import {
  discardOtherCallRecordings,
  listCallRecordingParts,
} from "@/lib/call-recording-storage";
import {
  serializeTenderMessage,
  tenderMessageInclude,
} from "@/lib/tender-messages";

/**
 * Atomically attach call recording files to a SYSTEM_CALL chat message.
 * Safe to call many times from both peers.
 * Only the caller's mixed recording is kept (one file, both sides).
 */
export async function finalizeCallRecording(callId: string): Promise<{
  ok: boolean;
  reason?: string;
  message?: ReturnType<typeof serializeTenderMessage>;
}> {
  const callMeta = await prisma.callSession.findUnique({
    where: { id: callId },
    select: { callerId: true },
  });
  if (!callMeta) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // Prefer caller recording; drop the other peer's duplicate upload.
  await discardOtherCallRecordings(callId, callMeta.callerId);
  let parts = await listCallRecordingParts(callId, {
    onlyUserId: callMeta.callerId,
  });
  // Legacy calls: if caller never uploaded, fall back to whatever remains.
  if (parts.length === 0) {
    parts = await listCallRecordingParts(callId);
  }
  if (parts.length === 0) {
    return { ok: false, reason: "NO_RECORDING" };
  }

  return prisma.$transaction(async (tx) => {
    // Serialize concurrent finalize from both peers.
    await tx.$queryRaw`SELECT id FROM callsession WHERE id = ${callId} FOR UPDATE`;

    const call = await tx.callSession.findUnique({
      where: { id: callId },
      select: {
        id: true,
        conversationId: true,
        mediaType: true,
        recordingMessageId: true,
      },
    });
    if (!call) {
      return { ok: false, reason: "NOT_FOUND" };
    }

    const label = callMediaLabel(call.mediaType);
    const body =
      call.mediaType === "VIDEO"
        ? `${label} · տեսագրություն (սերվեր)`
        : `${label} · ձայնագրություն (սերվեր)`;

    if (call.recordingMessageId) {
      const existing = await tx.tenderMessage.findUnique({
        where: { id: call.recordingMessageId },
        include: tenderMessageInclude,
      });
      if (!existing) {
        // Broken pointer — recreate below.
      } else {
        const keepUrls = new Set(parts.map((p) => p.url));
        // Drop duplicate peer attachments so chat keeps one recording.
        await tx.tenderMessageAttachment.deleteMany({
          where: {
            messageId: existing.id,
            url: { notIn: [...keepUrls] },
          },
        });

        const have = new Set(
          existing.attachments
            .filter((a) => keepUrls.has(a.url))
            .map((a) => a.url),
        );
        const missing = parts.filter((p) => !have.has(p.url));
        if (missing.length > 0) {
          await tx.tenderMessageAttachment.createMany({
            data: missing.map((p) => ({
              messageId: existing.id,
              url: p.url,
              originalFileName: p.originalFileName,
              mimeType: p.mimeType,
              sizeBytes: p.sizeBytes,
            })),
          });
        }
        for (const p of parts) {
          await tx.tenderMessageAttachment.updateMany({
            where: { messageId: existing.id, url: p.url },
            data: { sizeBytes: p.sizeBytes },
          });
        }
        const refreshed = await tx.tenderMessage.findUnique({
          where: { id: existing.id },
          include: tenderMessageInclude,
        });
        return {
          ok: true,
          message: refreshed
            ? serializeTenderMessage(refreshed)
            : serializeTenderMessage(existing),
        };
      }
    }

    const now = new Date();
    // Deduplicate by URL before create.
    const unique = new Map(parts.map((p) => [p.url, p]));
    const uniqueParts = [...unique.values()];

    const created = await tx.tenderMessage.create({
      data: {
        conversationId: call.conversationId,
        senderUserId: null,
        kind: "SYSTEM_CALL",
        body,
        attachments: {
          create: uniqueParts.map((p) => ({
            url: p.url,
            originalFileName: p.originalFileName,
            mimeType: p.mimeType,
            sizeBytes: p.sizeBytes,
          })),
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

    return { ok: true, message: serializeTenderMessage(created) };
  });
}
