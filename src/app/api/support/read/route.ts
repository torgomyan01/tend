import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateSupportConversation } from "@/lib/support-chat";

export const dynamic = "force-dynamic";

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const conversation = await getOrCreateSupportConversation(session.user.id);
  await prisma.supportConversation.update({
    where: { id: conversation.id },
    data: { userLastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
