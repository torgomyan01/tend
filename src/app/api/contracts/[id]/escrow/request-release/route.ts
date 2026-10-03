import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  escrowReleaseRequestedMessage,
  postEscrowSystemMessage,
} from "@/lib/escrow-messages";

export const dynamic = "force-dynamic";

/** Client confirms work is done and requests escrow release */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: contractId } = await context.params;

  const escrow = await prisma.tenderEscrow.findUnique({
    where: { contractId },
    select: {
      id: true,
      status: true,
      clientId: true,
      contractId: true,
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "NO_ESCROW" }, { status: 404 });
  }
  if (escrow.clientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (escrow.status !== "FUNDED") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  await prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "RELEASE_PENDING",
      releaseRequestedAt: new Date(),
    },
  });

  try {
    await postEscrowSystemMessage({
      contractId: escrow.contractId,
      body: escrowReleaseRequestedMessage(),
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, status: "RELEASE_PENDING" });
}
