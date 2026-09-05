import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_IMAGE_TYPES,
  documentExtension,
  isAllowedDocument,
  sanitizeImageExtension,
} from "@/lib/tender-form-upload";

export const BID_MAX_IMAGES = 8;
export const BID_MAX_DOCUMENTS = 6;
export const BID_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const BID_MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export async function saveBidImage(
  file: File,
  bidId: string,
): Promise<{ url: string; originalFileName: string; mimeType: string | null; sizeBytes: number }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error("INVALID_IMAGE");
  }
  if (file.size > BID_MAX_IMAGE_BYTES) {
    throw new Error("INVALID_IMAGE");
  }

  const extension = sanitizeImageExtension(file.type);
  const fileName = `${bidId}-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "uploads", "bids", bidId);
  await mkdir(directory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  return {
    url: `/uploads/bids/${bidId}/${fileName}`,
    originalFileName: file.name.slice(0, 120) || `image.${extension}`,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}

export async function saveBidDocument(
  file: File,
  bidId: string,
): Promise<{ url: string; originalFileName: string; mimeType: string | null; sizeBytes: number }> {
  if (!isAllowedDocument(file)) {
    throw new Error("INVALID_DOCUMENT");
  }
  if (file.size > BID_MAX_DOCUMENT_BYTES) {
    throw new Error("INVALID_DOCUMENT");
  }

  const ext = documentExtension(file);
  if (!ext) {
    throw new Error("INVALID_DOCUMENT");
  }

  const safeBase = path
    .basename(file.name)
    .replace(/[^\w.\u0580-\u0587\u0561-\u0587\s()-]/gi, "_");
  const truncatedName = safeBase.slice(0, 120);
  const fileName = `doc-${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "uploads", "bids", bidId);
  await mkdir(directory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  return {
    url: `/uploads/bids/${bidId}/${fileName}`,
    originalFileName: truncatedName || `document.${ext}`,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}
