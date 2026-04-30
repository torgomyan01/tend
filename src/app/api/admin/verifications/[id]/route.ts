import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional().nullable(),
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
  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const verificationRequest = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!verificationRequest) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (verificationRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "ALREADY_PROCESSED" },
      { status: 409 },
    );
  }

  const isApprove = parsed.data.action === "APPROVE";

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: {
        status: isApprove ? "APPROVED" : "REJECTED",
        moderationNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: verificationRequest.userId },
      data: {
        isVerified: isApprove,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
