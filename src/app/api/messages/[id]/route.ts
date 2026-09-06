import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyTenderPeerMessage } from "@/lib/tender-contract-notify";
import {
  displayName,
  lastReadAtFor,
  participantRole,
  serializeTenderMessage,
  tenderMessageInclude,
} from "@/lib/tender-messages";
import {
  MESSAGE_MAX_FILE_BYTES,
  MESSAGE_MAX_FILES,
  saveMessageUpload,
  type SavedMessageFile,
} from "@/lib/tender-message-upload";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const conversation = await prisma.tenderConversation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      archivedAt: true,
      clientId: true,
      providerId: true,
      contractId: true,
      clientLastReadAt: true,
      providerLastReadAt: true,
      lastMessageAt: true,
      tender: { select: { id: true, title: true } },
      client: { select: { id: true, name: true, email: true, image: true } },
      provider: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = participantRole(userId, conversation);
  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const messages = await prisma.tenderMessage.findMany({
    where: {
      conversationId: id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: tenderMessageInclude,
  });

  const peer =
    role === "client" ? conversation.provider : conversation.client;
  const lastRead = lastReadAtFor(role, conversation);

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
      archivedAt: conversation.archivedAt?.toISOString() ?? null,
      contractId: conversation.contractId,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      tender: conversation.tender,
      peer: {
        id: peer.id,
        name: displayName(peer),
        image: peer.image,
      },
      lastReadAt: lastRead?.toISOString() ?? null,
      role,
    },
    messages: messages.map(serializeTenderMessage),
  });
}

export async function POST(request: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = session.user.id;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isBlocked: true },
  });
  if (!me || me.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const conversation = await prisma.tenderConversation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      clientId: true,
      providerId: true,
      tenderId: true,
      tender: { select: { title: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = participantRole(userId, conversation);
  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (conversation.status === "ARCHIVED") {
    return NextResponse.json({ error: "ARCHIVED" }, { status: 409 });
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
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!body && files.length === 0) {
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  }

  if (files.length > MESSAGE_MAX_FILES) {
    return NextResponse.json({ error: "TOO_MANY_FILES" }, { status: 400 });
  }

  const savedFiles: SavedMessageFile[] = [];
  for (const file of files) {
    try {
      savedFiles.push(await saveMessageUpload(id, file));
    } catch {
      return NextResponse.json(
        { error: "INVALID_FILE", maxBytes: MESSAGE_MAX_FILE_BYTES },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.tenderMessage.create({
      data: {
        conversationId: id,
        senderUserId: userId,
        kind: "TEXT",
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
      include: tenderMessageInclude,
    });

    await tx.tenderConversation.update({
      where: { id },
      data: {
        lastMessageAt: now,
        ...(role === "client"
          ? { clientLastReadAt: now }
          : { providerLastReadAt: now }),
      },
    });

    return created;
  });

  const recipientId =
    role === "client" ? conversation.providerId : conversation.clientId;
  const preview =
    body ||
    (savedFiles.length
      ? `Կցված ֆայլեր (${savedFiles.length})`
      : "Նոր հաղորդագրություն");

  try {
    await notifyTenderPeerMessage({
      recipientUserId: recipientId,
      senderName: displayName(me),
      tenderTitle: conversation.tender.title,
      tenderId: conversation.tenderId,
      conversationId: id,
      preview,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ message: serializeTenderMessage(message) });
}
