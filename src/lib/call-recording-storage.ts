import { mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type CallRecordingMeta = {
  mimeType: string;
  ext: string;
  bytes: number;
  chunks: number;
  userId: string;
  updatedAt: string;
};

function callsRoot(callId: string) {
  return path.join(process.cwd(), "uploads", "calls", callId);
}

function safeUserPart(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "user";
}

export function recordingPaths(callId: string, userId: string, ext: string) {
  const dir = callsRoot(callId);
  const base = `from-${safeUserPart(userId)}`;
  return {
    dir,
    filePath: path.join(dir, `${base}.${ext}`),
    metaPath: path.join(dir, `${base}.meta.json`),
    publicUrl: `/uploads/calls/${callId}/${base}.${ext}`,
    fileName: `${base}.${ext}`,
  };
}

export function extForCallMime(mimeType: string, isVideo: boolean): string {
  const mime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime.includes("mp4")) return isVideo ? "mp4" : "m4a";
  if (mime.startsWith("video/")) return "vwebm";
  if (mime.startsWith("audio/")) return "webm";
  return isVideo ? "vwebm" : "webm";
}

export function mimeForCallExt(ext: string): string {
  switch (ext) {
    case "vwebm":
      return "video/webm";
    case "mp4":
      return "video/mp4";
    case "m4a":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

async function readMeta(metaPath: string): Promise<CallRecordingMeta | null> {
  try {
    const raw = await readFile(metaPath, "utf8");
    return JSON.parse(raw) as CallRecordingMeta;
  } catch {
    return null;
  }
}

async function writeMeta(metaPath: string, meta: CallRecordingMeta) {
  await writeFile(metaPath, JSON.stringify(meta), "utf8");
}

/** Append one MediaRecorder chunk to the participant's recording file. No size cap. */
export async function appendCallRecordingChunk(params: {
  callId: string;
  userId: string;
  mimeType: string;
  isVideo: boolean;
  chunk: Buffer;
}): Promise<CallRecordingMeta> {
  if (params.chunk.length <= 0) {
    throw new Error("EMPTY_CHUNK");
  }

  const ext = extForCallMime(params.mimeType, params.isVideo);
  const { dir, filePath, metaPath } = recordingPaths(
    params.callId,
    params.userId,
    ext,
  );
  await mkdir(dir, { recursive: true });

  const handle = await open(filePath, "a");
  try {
    await handle.write(params.chunk);
  } finally {
    await handle.close();
  }

  const info = await stat(filePath);
  const prev = await readMeta(metaPath);
  const meta: CallRecordingMeta = {
    mimeType:
      params.mimeType.split(";")[0]?.trim().toLowerCase() ||
      mimeForCallExt(ext),
    ext,
    bytes: info.size,
    chunks: (prev?.chunks ?? 0) + 1,
    userId: params.userId,
    updatedAt: new Date().toISOString(),
  };
  await writeMeta(metaPath, meta);
  return meta;
}

export type FinalizedRecordingPart = {
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

/** List recording parts already uploaded for a call. */
export async function listCallRecordingParts(
  callId: string,
  options?: { onlyUserId?: string },
): Promise<FinalizedRecordingPart[]> {
  const dir = callsRoot(callId);
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const onlyPrefix = options?.onlyUserId
    ? `from-${safeUserPart(options.onlyUserId)}.`
    : null;

  const parts: FinalizedRecordingPart[] = [];
  for (const name of entries) {
    if (!name.startsWith("from-")) continue;
    if (name.endsWith(".meta.json")) continue;
    if (onlyPrefix && !name.startsWith(onlyPrefix)) continue;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!["webm", "vwebm", "mp4", "m4a"].includes(ext)) continue;

    const filePath = path.join(dir, name);
    try {
      const info = await stat(filePath);
      if (!info.isFile() || info.size < 200) continue;
      const meta = await readMeta(
        path.join(dir, name.replace(/\.[^.]+$/, ".meta.json")),
      );
      parts.push({
        url: `/uploads/calls/${callId}/${name}`,
        originalFileName: name,
        mimeType: meta?.mimeType || mimeForCallExt(ext),
        sizeBytes: info.size,
      });
    } catch {
      /* skip */
    }
  }

  return parts.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName));
}

/** Delete peer uploads that are not the designated recorder (caller). */
export async function discardOtherCallRecordings(
  callId: string,
  keepUserId: string,
): Promise<void> {
  const dir = callsRoot(callId);
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  const keepBase = `from-${safeUserPart(keepUserId)}`;
  await Promise.all(
    entries.map(async (name) => {
      if (!name.startsWith("from-")) return;
      if (name === keepBase || name.startsWith(`${keepBase}.`)) return;
      try {
        await rm(path.join(dir, name), { force: true });
      } catch {
        /* ignore */
      }
    }),
  );
}
