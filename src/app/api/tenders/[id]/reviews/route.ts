import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(4000).optional().nullable(),
});

/** Միայն COMPLETED մրցույթում՝ պատվիրատու ↔ ընտրված կատարող։ Նոր գնահատական՝ մոդերացիա։ */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const tender = await prisma.tender.findFirst({
    where: {
      id: tenderId,
      status: "COMPLETED",
      awardedBidId: { not: null },
    },
    select: {
      clientId: true,
      awardedBidId: true,
      awardedBid: {
        select: { id: true, providerId: true },
      },
    },
  });

  if (
    !tender?.awardedBid ||
    tender.awardedBidId === null ||
    tender.awardedBidId !== tender.awardedBid.id
  ) {
    return NextResponse.json({ error: "NOT_REVIEWABLE" }, { status: 409 });
  }

  const providerId = tender.awardedBid.providerId;
  const reviewerId = session.user.id;

  let revieweeId: string;
  if (reviewerId === tender.clientId) {
    revieweeId = providerId;
  } else if (reviewerId === providerId) {
    revieweeId = tender.clientId;
  } else {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const existing = await prisma.review.findUnique({
    where: {
      tenderId_reviewerId_revieweeId: {
        tenderId,
        reviewerId,
        revieweeId,
      },
    },
    select: { moderationStatus: true },
  });

  if (existing?.moderationStatus === "APPROVED") {
    return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
  }

  if (existing?.moderationStatus === "PENDING") {
    return NextResponse.json({ error: "REVIEW_PENDING_MODERATION" }, { status: 409 });
  }

  await prisma.review.create({
    data: {
      tenderId,
      reviewerId,
      revieweeId,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
      moderationStatus: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
