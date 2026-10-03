import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  markMissedIfStillRinging,
  serializeCallSession,
} from "@/lib/call-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const userId = session.user.id;

  const ringing = await prisma.callSession.findMany({
    where: {
      calleeId: userId,
      status: "RINGING",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
      conversation: {
        select: {
          id: true,
          tender: { select: { id: true, title: true } },
        },
      },
    },
  });

  await Promise.allSettled(
    ringing.map((c) => markMissedIfStillRinging(c.id)),
  );

  const fresh = await prisma.callSession.findMany({
    where: {
      calleeId: userId,
      status: "RINGING",
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
      conversation: {
        select: {
          id: true,
          tender: { select: { id: true, title: true } },
        },
      },
    },
  });

  const active = await prisma.callSession.findFirst({
    where: {
      OR: [
        { callerId: userId, status: "ACTIVE" },
        { calleeId: userId, status: "ACTIVE" },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      caller: { select: { id: true, name: true, email: true, image: true } },
      callee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({
    incoming: fresh.map((c) => ({
      ...serializeCallSession(c),
      tenderTitle: c.conversation.tender.title,
    })),
    active: active ? serializeCallSession(active) : null,
  });
}
