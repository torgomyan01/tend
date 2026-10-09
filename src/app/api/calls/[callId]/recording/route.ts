import { NextResponse } from "next/server";
import { requireCallParticipant } from "@/lib/call-access";
import { appendCallRecordingChunk } from "@/lib/call-recording-storage";
import { finalizeCallRecording } from "@/lib/finalize-call-recording";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ callId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { call, userId } = access;

  // Accept chunks during/after the call so late flushes are not rejected.
  const allowed = new Set([
    "RINGING",
    "ACTIVE",
    "ENDED",
    "REJECTED",
    "CANCELLED",
    "MISSED",
  ]);
  if (!allowed.has(call.status)) {
    return NextResponse.json({ error: "CALL_CLOSED" }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const action = String(formData.get("action") ?? "finalize");

  if (action === "chunk") {
    // Single recorder policy: only the caller may upload (mixed both sides).
    if (userId !== call.callerId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const file = formData.get("chunk");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "EMPTY_CHUNK" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "CHUNK_TOO_LARGE" }, { status: 400 });
    }

    const mimeType =
      String(formData.get("mimeType") ?? file.type ?? "").trim() ||
      (call.mediaType === "VIDEO" ? "video/webm" : "audio/webm");

    try {
      const meta = await appendCallRecordingChunk({
        callId,
        userId,
        mimeType,
        isVideo: call.mediaType === "VIDEO",
        chunk: Buffer.from(await file.arrayBuffer()),
      });
      return NextResponse.json({ ok: true, meta });
    } catch (error) {
      console.error("call recording chunk failed", callId, error);
      return NextResponse.json({ error: "CHUNK_WRITE_FAILED" }, { status: 500 });
    }
  }

  if (action === "finalize") {
    try {
      const result = await finalizeCallRecording(callId);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.reason ?? "FINALIZE_FAILED" },
          { status: result.reason === "NO_RECORDING" ? 404 : 500 },
        );
      }
      return NextResponse.json({ ok: true, message: result.message });
    } catch (error) {
      console.error("call recording finalize failed", callId, error);
      return NextResponse.json({ error: "FINALIZE_FAILED" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
