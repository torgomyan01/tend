import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;
const MIN_IMAGES = 1;
const MAX_PORTFOLIO_ITEMS = 30;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function imageExt(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function saveImage(file: File, ownerId: string): Promise<string> {
  const ext = imageExt(file);
  if (!ext) throw new Error("INVALID_IMAGE");
  if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error("INVALID_IMAGE");

  const fileName = `${ownerId}-${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "uploads", "portfolio");
  await mkdir(directory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);
  return `/uploads/portfolio/${fileName}`;
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

  const titleRaw = formData.get("title");
  const descriptionRaw = formData.get("description");
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  if (title.length < 2 || title.length > 200) {
    return NextResponse.json({ error: "INVALID_TITLE" }, { status: 400 });
  }
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
      ? descriptionRaw.trim().slice(0, 2000)
      : null;

  const imageEntries = formData.getAll("images");
  const imageFiles = imageEntries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (imageFiles.length < MIN_IMAGES) {
    return NextResponse.json({ error: "TOO_FEW_IMAGES" }, { status: 400 });
  }
  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: "TOO_MANY_IMAGES" }, { status: 400 });
  }
  for (const file of imageFiles) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
  }

  const existingCount = await prisma.userPortfolioItem.count({
    where: { userId: me.id },
  });
  if (existingCount >= MAX_PORTFOLIO_ITEMS) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 400 });
  }

  let imageUrls: string[] = [];
  try {
    imageUrls = [];
    for (const file of imageFiles) {
      imageUrls.push(await saveImage(file, me.id));
    }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE") {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  const max = await prisma.userPortfolioItem.aggregate({
    _max: { sortOrder: true },
    where: { userId: me.id },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const created = await prisma.userPortfolioItem.create({
    data: {
      userId: me.id,
      title,
      description,
      sortOrder,
      images: {
        create: imageUrls.map((url, index) => ({ url, sortOrder: index })),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      sortOrder: true,
      createdAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, sortOrder: true },
      },
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
