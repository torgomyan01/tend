import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyProviderOwnerSharedContact } from "@/lib/tender-owner-share-contact-notify";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string; bidId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId, bidId } = await context.params;

  const bid = await prisma.bid.findFirst({
    where: {
      id: bidId,
      tenderId,
      status: { notIn: ["WITHDRAWN", "REJECTED"] },
    },
    select: {
      id: true,
      ownerContactSharedAt: true,
      tender: {
        select: {
          clientId: true,
          title: true,
        },
      },
      provider: {
        select: {
          telegramChatId: true,
        },
      },
    },
  });

  if (!bid || bid.tender.clientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: bid.tender.clientId },
    select: {
      phone: true,
      name: true,
      email: true,
    },
  });

  if (!owner?.phone?.trim()) {
    return NextResponse.json({ error: "OWNER_PHONE_MISSING" }, { status: 409 });
  }

  const alreadyShared = bid.ownerContactSharedAt !== null;

  if (!alreadyShared) {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { ownerContactSharedAt: new Date() },
    });
  }

  if (!alreadyShared) {
    try {
      await notifyProviderOwnerSharedContact({
        chatId: bid.provider.telegramChatId,
        tenderTitle: bid.tender.title,
        tenderId,
        ownerDisplayName: owner.name?.trim() || owner.email,
        ownerPhone: owner.phone,
      });
    } catch {
      /* Telegram սխալը չպետք է հետ շրջի PATCH-ը */
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyShared,
    ownerPhoneVisibleToProvider: Boolean(owner.phone?.trim()),
  });
}
