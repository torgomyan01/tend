import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function removeUploadFile(fileUrl: string | null | undefined) {
  if (!fileUrl?.startsWith("/uploads/credentials/")) return;
  try {
    const full = path.join(
      process.cwd(),
      "uploads",
      fileUrl.replace(/^\/uploads\//, ""),
    );
    await unlink(full);
  } catch {
    /* ignore — already removed */
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
  const credential = await prisma.userCredential.findUnique({
    where: { id },
    select: { id: true, userId: true, fileUrl: true },
  });

  if (!credential || credential.userId !== session.user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.userCredential.delete({ where: { id } });
  await removeUploadFile(credential.fileUrl);

  return NextResponse.json({ ok: true });
}
