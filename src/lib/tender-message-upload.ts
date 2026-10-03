import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MESSAGE_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MESSAGE_MAX_VOICE_BYTES = 15 * 1024 * 1024;
export const MESSAGE_MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MESSAGE_MAX_FILES = 5;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
  "video/webm",
  "video/mp4",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/webm": "vwebm",
  "video/mp4": "mp4",
};

const ALLOWED_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "doc",
  "docx",
  "txt",
  "webm",
  "ogg",
  "mp3",
  "m4a",
  "aac",
  "wav",
]);

const AUDIO_EXT = new Set(["webm", "ogg", "mp3", "m4a", "aac", "wav"]);
const VIDEO_EXT = new Set(["vwebm", "mp4"]);

export type SavedMessageFile = {
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export function normalizeMessageMime(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAudioMessageMime(type: string): boolean {
  const mime = normalizeMessageMime(type);
  return mime.startsWith("audio/");
}

export function isVideoMessageMime(type: string): boolean {
  const mime = normalizeMessageMime(type);
  return mime.startsWith("video/");
}

function maxBytesForFile(file: File): number {
  const mime = normalizeMessageMime(file.type);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (mime.startsWith("video/") || (ext && VIDEO_EXT.has(ext))) {
    return MESSAGE_MAX_VIDEO_BYTES;
  }
  if (mime.startsWith("audio/") || (ext && AUDIO_EXT.has(ext))) {
    return MESSAGE_MAX_VOICE_BYTES;
  }
  return MESSAGE_MAX_FILE_BYTES;
}

function extFromFile(file: File): string | null {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ALLOWED_EXT.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return EXT_BY_MIME[normalizeMessageMime(file.type)] ?? null;
}

export function isAllowedMessageFile(file: File): boolean {
  if (file.size <= 0 || file.size > maxBytesForFile(file)) {
    return false;
  }
  const mime = normalizeMessageMime(file.type);
  if (ALLOWED_MIME.has(mime)) {
    return true;
  }
  return extFromFile(file) !== null;
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "webm":
      return "audio/webm";
    case "ogg":
      return "audio/ogg";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "wav":
      return "audio/wav";
    case "vwebm":
      return "video/webm";
    case "mp4":
      return "video/mp4";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function saveMessageUpload(
  conversationId: string,
  file: File,
): Promise<SavedMessageFile> {
  if (!isAllowedMessageFile(file)) {
    throw new Error("INVALID_FILE");
  }

  const ext = extFromFile(file) ?? "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const directory = path.join(
    process.cwd(),
    "uploads",
    "messages",
    conversationId,
  );
  await mkdir(directory, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  const mimeType =
    normalizeMessageMime(file.type) || mimeForExt(ext);

  return {
    url: `/uploads/messages/${conversationId}/${fileName}`,
    originalFileName: file.name.slice(0, 255),
    mimeType,
    sizeBytes: file.size,
  };
}
