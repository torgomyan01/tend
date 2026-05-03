import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notifyTenderComplaintReporterDecision } from "@/lib/tender-complaint-notify";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  action: z.enum(["REVIEWED", "DISMISSED"]),
  note: z.string().trim().max(800).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const complaint = await prisma.tenderComplaint.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      tenderId: true,
      tender: { select: { title: true } },
      reporter: { select: { telegramChatId: true } },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (complaint.status !== "PENDING") {
    return NextResponse.json({ error: "ALREADY_PROCESSED" }, { status: 409 });
  }

  await prisma.tenderComplaint.update({
    where: { id: complaint.id },
    data: {
      status: parsed.data.action,
      moderatorNote: parsed.data.note ?? null,
      reviewedAt: new Date(),
    },
  });

  await notifyTenderComplaintReporterDecision({
    chatId: complaint.reporter.telegramChatId,
    tenderTitle: complaint.tender.title,
    tenderId: complaint.tenderId,
    decision: parsed.data.action,
    note: parsed.data.note,
  });

  return NextResponse.json({ ok: true });
}
