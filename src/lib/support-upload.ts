import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const SUPPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
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
};

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "txt"]);

export type SavedSupportFile = {
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

function extFromFile(file: File): string | null {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ALLOWED_EXT.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return EXT_BY_MIME[file.type] ?? null;
}

export function isAllowedSupportFile(file: File): boolean {
  if (file.size <= 0 || file.size > SUPPORT_MAX_FILE_BYTES) {
    return false;
  }
  if (ALLOWED_MIME.has(file.type)) {
    return true;
  }
  return extFromFile(file) !== null;
}

export async function saveSupportUpload(file: File): Promise<SavedSupportFile> {
  if (!isAllowedSupportFile(file)) {
    throw new Error("INVALID_FILE");
  }

  const ext = extFromFile(file) ?? "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "uploads", "support");
  await mkdir(directory, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  const mimeType =
    file.type ||
    (ext === "pdf"
      ? "application/pdf"
      : ext === "txt"
        ? "text/plain"
        : ext === "doc"
          ? "application/msword"
          : ext === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream");

  return {
    url: `/uploads/support/${fileName}`,
    originalFileName: file.name.slice(0, 255),
    mimeType,
    sizeBytes: file.size,
  };
}
