import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { participantRole } from "@/lib/tender-messages";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = session.user.id;

  const conversation = await prisma.tenderConversation.findUnique({
    where: { id },
    select: { id: true, clientId: true, providerId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = participantRole(userId, conversation);
  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const now = new Date();
  await prisma.tenderConversation.update({
    where: { id },
    data:
      role === "client"
        ? { clientLastReadAt: now }
        : { providerLastReadAt: now },
  });

  return NextResponse.json({ ok: true, readAt: now.toISOString() });
}
