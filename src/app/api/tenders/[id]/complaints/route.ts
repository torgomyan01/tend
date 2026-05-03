import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  isValidTenderComplaintReasonId,
} from "@/lib/tender-complaint-reasons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reasonId: z.string().trim().min(1).max(64),
  details: z.string().trim().min(1).max(8000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;

  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { reasonId, details } = parsed.data;

  if (!isValidTenderComplaintReasonId(reasonId)) {
    return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
  }

  const minLen = reasonId === "other" ? 40 : 20;
  if (details.length < minLen) {
    return NextResponse.json({ error: "DETAILS_TOO_SHORT", minLen }, { status: 400 });
  }

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, status: true, clientId: true },
  });

  if (!tender || tender.status !== "ACTIVE") {
    return NextResponse.json({ error: "TENDER_NOT_FOUND" }, { status: 404 });
  }

  if (tender.clientId === session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.tenderComplaint.create({
    data: {
      tenderId: tender.id,
      reporterId: session.user.id,
      reasonId,
      details,
    },
  });

  return NextResponse.json({ ok: true });
}
