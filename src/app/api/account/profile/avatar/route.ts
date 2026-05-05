import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function removePublicFile(publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith("/uploads/avatars/")) {
    return;
  }
  try {
    const full = path.join(
      process.cwd(),
      "uploads",
      publicUrl.replace(/^\/uploads\//, ""),
    );
    await unlink(full);
  } catch {
    /* ֆայլը արդեն հեռացված կամ չկա */
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBlocked: true, image: true },
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

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  await removePublicFile(me.image);

  const ext = extFromMime(file.type);
  const fileName = `${me.id}-${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "uploads", "avatars");
  const rel = `/uploads/avatars/${fileName}`;

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  await prisma.user.update({
    where: { id: me.id },
    data: { image: rel },
  });

  return NextResponse.json({ ok: true, image: rel });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBlocked: true, image: true },
  });

  if (!me || me.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await removePublicFile(me.image);

  await prisma.user.update({
    where: { id: me.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true, image: null });
}
