import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 6;
export const MIN_IMAGES_PUBLISH = 1;
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;
export const MAX_SERVICES = 10;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
]);

export function sanitizeImageExtension(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function documentExtension(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
    return ext.slice(1);
  }
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return mimeMap[file.type] ?? null;
}

export function isAllowedDocument(file: File): boolean {
  if (file.type && ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return true;
  }
  const ext = path.extname(file.name).toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.has(ext);
}

export async function saveTenderImage(file: File, tenderId: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error("INVALID_IMAGE");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("INVALID_IMAGE");
  }

  const extension = sanitizeImageExtension(file.type);
  const fileName = `${tenderId}-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "uploads", "tenders");
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, buffer);

  return `/uploads/tenders/${fileName}`;
}

export async function saveTenderDocument(
  file: File,
  tenderId: string,
): Promise<{ url: string; originalFileName: string; mimeType: string | null }> {
  if (!isAllowedDocument(file)) {
    throw new Error("INVALID_DOCUMENT");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("INVALID_DOCUMENT");
  }

  const ext = documentExtension(file);
  if (!ext) {
    throw new Error("INVALID_DOCUMENT");
  }

  const safeBase = path.basename(file.name).replace(/[^\w.\u0580-\u0587\u0561-\u0587\s()-]/gi, "_");
  const truncatedName = safeBase.slice(0, 120);
  const fileName = `${tenderId}-doc-${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "uploads", "tender-documents");
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/tender-documents/${fileName}`,
    originalFileName: truncatedName || `document.${ext}`,
    mimeType: file.type || null,
  };
}
