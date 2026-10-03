import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCallParticipant } from "@/lib/call-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ callId: string }> };

const postSchema = z.object({
  type: z.enum(["OFFER", "ANSWER", "ICE"]),
  payload: z.string().min(2).max(200_000),
});

export async function GET(request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { userId, call } = access;

  if (call.status !== "RINGING" && call.status !== "ACTIVE") {
    return NextResponse.json({
      signals: [],
      callStatus: call.status,
    });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const signals = await prisma.callSignal.findMany({
    where: {
      callId,
      NOT: { senderUserId: userId },
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
      senderUserId: true,
    },
  });

  return NextResponse.json({
    signals: signals.map((s) => ({
      id: s.id,
      type: s.type,
      payload: s.payload,
      createdAt: s.createdAt.toISOString(),
      senderUserId: s.senderUserId,
    })),
    callStatus: call.status,
  });
}

export async function POST(request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  const { userId, call } = access;

  if (call.status !== "RINGING" && call.status !== "ACTIVE") {
    return NextResponse.json({ error: "CALL_CLOSED" }, { status: 409 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  // Validate payload is JSON
  try {
    JSON.parse(parsed.data.payload);
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const signal = await prisma.callSignal.create({
    data: {
      callId,
      senderUserId: userId,
      type: parsed.data.type,
      payload: parsed.data.payload,
    },
    select: {
      id: true,
      type: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    signal: {
      id: signal.id,
      type: signal.type,
      createdAt: signal.createdAt.toISOString(),
    },
  });
}
