import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateSupportConversation,
  serializeSupportMessage,
  supportMessageInclude,
} from "@/lib/support-chat";
import { notifyUserSupportReply } from "@/lib/support-notify-user";
import {
  saveSupportUpload,
  SUPPORT_MAX_FILE_BYTES,
  type SavedSupportFile,
} from "@/lib/support-upload";

export const dynamic = "force-dynamic";

const MAX_FILES = 5;

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { userId } = await context.params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const conversation = await prisma.supportConversation.findUnique({
    where: { userId },
  });

  if (!conversation) {
    return NextResponse.json({
      conversationId: null,
      messages: [],
      user: null,
    });
  }

  const [messages, user] = await Promise.all([
    prisma.supportMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 300,
      include: supportMessageInclude,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        telegramVerifiedAt: true,
        emailVerified: true,
      },
    }),
  ]);

  return NextResponse.json({
    conversationId: conversation.id,
    messages: messages.map(serializeSupportMessage),
    user,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { userId } = await context.params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isBlocked: true },
  });

  if (!target) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const body = String(formData.get("body") ?? "").trim();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (!body && files.length === 0) {
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "TOO_MANY_FILES" }, { status: 400 });
  }

  const savedFiles: SavedSupportFile[] = [];
  for (const file of files) {
    try {
      savedFiles.push(await saveSupportUpload(file));
    } catch {
      return NextResponse.json(
        { error: "INVALID_FILE", maxBytes: SUPPORT_MAX_FILE_BYTES },
        { status: 400 },
      );
    }
  }

  const conversation = await getOrCreateSupportConversation(userId);
  const now = new Date();

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        conversationId: conversation.id,
        sender: "STAFF",
        senderUserId: session.user.id,
        body: body || " ",
        attachments: {
          create: savedFiles.map((f) => ({
            url: f.url,
            originalFileName: f.originalFileName,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
          })),
        },
      },
      include: supportMessageInclude,
    });

    await tx.supportConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        staffLastReadAt: now,
      },
    });

    return created;
  });

  const staffUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  await notifyUserSupportReply({
    userId,
    body: body || "(կցված ֆայլեր)",
    staffName: staffUser?.name ?? null,
    attachmentNames: savedFiles.map((f) => f.originalFileName),
  }).catch(() => undefined);

  return NextResponse.json({
    message: serializeSupportMessage(message),
  });
}
