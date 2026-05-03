import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

/** Մոդերացիա՝ գնահատական PENDING → APPROVED կամ հեռացում (կարող է նորից ուղարկել)։ */
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

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, moderationStatus: true },
  });

  if (!review) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (review.moderationStatus !== "PENDING") {
    return NextResponse.json({ error: "NOT_IN_REVIEW" }, { status: 409 });
  }

  if (parsed.data.action === "APPROVE") {
    await prisma.review.update({
      where: { id: review.id },
      data: {
        moderationStatus: "APPROVED",
        moderatedAt: new Date(),
      },
    });
  } else {
    await prisma.review.delete({
      where: { id: review.id },
    });
  }

  return NextResponse.json({ ok: true });
}
