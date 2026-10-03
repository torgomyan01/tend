import { NextResponse } from "next/server";
import { requireCallParticipant } from "@/lib/call-access";
import { serializeCallSession } from "@/lib/call-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ callId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { callId } = await context.params;
  const access = await requireCallParticipant(callId);
  if ("error" in access && access.error) return access.error;
  return NextResponse.json({ call: serializeCallSession(access.call) });
}
