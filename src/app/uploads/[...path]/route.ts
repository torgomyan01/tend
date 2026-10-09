import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeUploadRead } from "@/lib/upload-access";

export const dynamic = "force-dynamic";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".xls") return "application/vnd.ms-excel";
  if (ext === ".xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".vwebm") return "video/webm";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".wav") return "audio/wav";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;

  // prevent traversal + normalize
  const safeParts = parts
    .filter((p) => p && p !== "." && p !== "..")
    .map((p) => p.replace(/\\/g, "/"));

  if (safeParts.length === 0) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const access = await authorizeUploadRead(safeParts);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: access.status },
    );
  }

  const resolved = path.resolve(UPLOADS_ROOT, ...safeParts);
  if (!resolved.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const buffer = await readFile(resolved);
    const root = safeParts[0];
    const isPublic =
      root === "avatars" ||
      root === "tenders" ||
      root === "portfolio" ||
      root === "tender-documents";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(resolved),
        "Cache-Control": isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
