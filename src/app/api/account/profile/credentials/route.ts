import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PER_USER = 25;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"]);

const KIND_VALUES = ["DIPLOMA", "LICENSE", "CERTIFICATE", "OTHER"] as const;
const kindSchema = z.enum(KIND_VALUES);

function fileExtension(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext.slice(1);
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/msword") return "doc";
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBlocked: true },
  });
  if (!me || me.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const ext = fileExtension(file);
  if (
    !ext ||
    (file.type && !ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.has(`.${ext}`))
  ) {
    return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
  }

  const titleRaw = formData.get("title");
  const issuerRaw = formData.get("issuer");
  const descriptionRaw = formData.get("description");
  const kindRaw = formData.get("kind");

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  if (title.length < 2 || title.length > 200) {
    return NextResponse.json({ error: "INVALID_TITLE" }, { status: 400 });
  }
  const issuer =
    typeof issuerRaw === "string" && issuerRaw.trim().length > 0
      ? issuerRaw.trim().slice(0, 200)
      : null;
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
      ? descriptionRaw.trim().slice(0, 2000)
      : null;
  const parsedKind = kindSchema.safeParse(kindRaw);
  const kind = parsedKind.success ? parsedKind.data : "CERTIFICATE";

  const existingCount = await prisma.userCredential.count({
    where: { userId: me.id },
  });
  if (existingCount >= MAX_PER_USER) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 400 });
  }

  const fileName = `${me.id}-${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "uploads", "credentials");
  await mkdir(directory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  const safeOriginal = path.basename(file.name).slice(0, 255);
  const fileUrl = `/uploads/credentials/${fileName}`;

  const max = await prisma.userCredential.aggregate({
    _max: { sortOrder: true },
    where: { userId: me.id },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const created = await prisma.userCredential.create({
    data: {
      userId: me.id,
      kind,
      title,
      issuer,
      description,
      fileUrl,
      originalFileName: safeOriginal,
      mimeType: file.type || null,
      sortOrder,
    },
    select: {
      id: true,
      kind: true,
      title: true,
      issuer: true,
      description: true,
      fileUrl: true,
      originalFileName: true,
      mimeType: true,
      sortOrder: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, credential: created });
}
