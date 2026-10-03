import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  escrowStatusChangeMessage,
  postEscrowSystemMessage,
} from "@/lib/escrow-messages";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

/** Պատվիրատու կամ կատարող · վեճ բացել (միայն FUNDED) */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: contractId } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const escrow = await prisma.tenderEscrow.findUnique({
    where: { contractId },
    select: {
      id: true,
      status: true,
      clientId: true,
      providerId: true,
      contractId: true,
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "NO_ESCROW" }, { status: 404 });
  }

  const userId = session.user.id;
  if (userId !== escrow.clientId && userId !== escrow.providerId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (escrow.status !== "FUNDED" && escrow.status !== "RELEASE_PENDING") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  await prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "DISPUTED",
      disputedAt: new Date(),
      disputeReason: parsed.data.reason,
    },
  });

  try {
    await postEscrowSystemMessage({
      contractId: escrow.contractId,
      body: escrowStatusChangeMessage(
        "DISPUTED",
        `Պատճառ՝ ${parsed.data.reason}`,
      ),
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, status: "DISPUTED" });
}
