import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function removeImageFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/portfolio/")) return;
  try {
    const full = path.join(
      process.cwd(),
      "uploads",
      url.replace(/^\/uploads\//, ""),
    );
    await unlink(full);
  } catch {
    /* ignore */
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.userPortfolioItem.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      images: { select: { url: true } },
    },
  });

  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.userPortfolioItem.delete({ where: { id } });
  await Promise.all(item.images.map((img) => removeImageFile(img.url)));

  return NextResponse.json({ ok: true });
}
