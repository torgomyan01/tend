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
  note: z.string().trim().max(500).optional(),
  receiptUrl: z.string().trim().url().max(500).optional(),
});

/** Պատվիրատուն նշում է, որ բանկային փոխանցումը կատարել է */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: contractId } = await context.params;
  const raw = await request.json().catch(() => ({}));
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
      paymentCode: true,
      contractId: true,
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "NO_ESCROW" }, { status: 404 });
  }
  if (escrow.clientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (escrow.status !== "PENDING_FUNDING") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  await prisma.tenderEscrow.update({
    where: { id: escrow.id },
    data: {
      status: "PAYMENT_SUBMITTED",
      clientNote: parsed.data.note ?? null,
      clientReceiptUrl: parsed.data.receiptUrl ?? null,
    },
  });

  try {
    await postEscrowSystemMessage({
      contractId: escrow.contractId,
      body: escrowStatusChangeMessage(
        "PAYMENT_SUBMITTED",
        `Պատվիրատուն նշել է փոխանցումը (կոդ՝ ${escrow.paymentCode})։ Ադմինը կստուգի մուտքը։`,
      ),
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, status: "PAYMENT_SUBMITTED" });
}
