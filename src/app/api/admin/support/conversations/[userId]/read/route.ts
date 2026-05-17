import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { userId } = await params;
  const conversation = await prisma.supportConversation.findUnique({
    where: { userId },
  });

  if (!conversation) {
    return NextResponse.json({ ok: true });
  }

  await prisma.supportConversation.update({
    where: { id: conversation.id },
    data: { staffLastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
