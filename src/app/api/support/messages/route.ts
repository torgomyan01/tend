import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdminsNewSupportMessage } from "@/lib/support-notify-admins";
import {
  getOrCreateSupportConversation,
  serializeSupportMessage,
  supportMessageInclude,
} from "@/lib/support-chat";
import {
  saveSupportUpload,
  SUPPORT_MAX_FILE_BYTES,
  type SavedSupportFile,
} from "@/lib/support-upload";

export const dynamic = "force-dynamic";

const MAX_FILES = 5;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const conversation = await getOrCreateSupportConversation(session.user.id);

  const messages = await prisma.supportMessage.findMany({
    where: {
      conversationId: conversation.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: supportMessageInclude,
  });

  const unreadWhere = {
    conversationId: conversation.id,
    sender: "STAFF" as const,
    ...(conversation.userLastReadAt
      ? { createdAt: { gt: conversation.userLastReadAt } }
      : {}),
  };

  const [unreadFromStaff, latestUnread] = await Promise.all([
    prisma.supportMessage.count({ where: unreadWhere }),
    prisma.supportMessage.findFirst({
      where: unreadWhere,
      orderBy: { createdAt: "desc" },
      include: supportMessageInclude,
    }),
  ]);

  return NextResponse.json({
    conversationId: conversation.id,
    messages: messages.map(serializeSupportMessage),
    unreadCount: unreadFromStaff,
    latestUnread: latestUnread
      ? serializeSupportMessage(latestUnread)
      : null,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isBlocked: true,
    },
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
        {
          error: "INVALID_FILE",
          maxBytes: SUPPORT_MAX_FILE_BYTES,
        },
        { status: 400 },
      );
    }
  }

  const conversation = await getOrCreateSupportConversation(me.id);
  const now = new Date();

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        conversationId: conversation.id,
        sender: "USER",
        senderUserId: me.id,
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
      data: { lastMessageAt: now },
    });

    return created;
  });

  await notifyAdminsNewSupportMessage({
    fromUserId: me.id,
    fromUserName: me.name,
    fromUserEmail: me.email,
    fromUserPhone: me.phone,
    body: body || "(կցված ֆայլեր)",
    attachmentNames: savedFiles.map((f) => f.originalFileName),
  }).catch(() => undefined);

  return NextResponse.json({
    message: serializeSupportMessage(message),
  });
}
