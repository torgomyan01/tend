import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFileExtension(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function saveImage(file: File, prefix: string) {
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    throw new Error("INVALID_FILE_TYPE");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const extension = sanitizeFileExtension(file.type);
  const fileName = `${prefix}-${randomUUID()}.${extension}`;
  const uploadsDirectory = path.join(
    process.cwd(),
    "uploads",
    "verifications",
  );
  const filePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(filePath, buffer);

  return `/uploads/verifications/${fileName}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const selfieFile = formData.get("selfie");
  const documentFile = formData.get("document");

  if (!(selfieFile instanceof File) || !(documentFile instanceof File)) {
    return NextResponse.json({ error: "FILES_REQUIRED" }, { status: 400 });
  }

  try {
    const [selfieUrl, documentUrl] = await Promise.all([
      saveImage(selfieFile, "selfie"),
      saveImage(documentFile, "document"),
    ]);

    const existingPendingRequest = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existingPendingRequest) {
      return NextResponse.json(
        { error: "PENDING_REQUEST_EXISTS" },
        { status: 409 },
      );
    }

    const requestRecord = await prisma.verificationRequest.create({
      data: {
        userId: session.user.id,
        selfieUrl,
        documentUrl,
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        selfieUrl: true,
        documentUrl: true,
      },
    });

    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FILE_TYPE") {
      return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "VERIFICATION_SUBMIT_FAILED" },
      { status: 500 },
    );
  }
}
