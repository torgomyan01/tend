import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Միայն մրցույթի պատվիրատուին՝ բոլոր առաջարկները ամբողջական տվյալներով։ */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: session.user.id },
    select: { id: true },
  });

  if (!tender) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const bids = await prisma.bid.findMany({
    where: { tenderId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      price: true,
      timelineDays: true,
      coverLetter: true,
      bidFeeAmount: true,
      ownerContactSharedAt: true,
      createdAt: true,
      attachments: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          kind: true,
          url: true,
          originalFileName: true,
          mimeType: true,
        },
      },
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          telegramVerifiedAt: true,
          isVerified: true,
          accountType: true,
          companyName: true,
        },
      },
    },
  });

  return NextResponse.json({
    bids: bids.map((b) => ({
      id: b.id,
      status: b.status,
      price: Number(b.price),
      timelineDays: b.timelineDays,
      coverLetter: b.coverLetter,
      bidFeeAmount: Number(b.bidFeeAmount),
      ownerContactSharedAt: b.ownerContactSharedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      attachments: b.attachments,
      provider: {
        ...b.provider,
        telegramVerifiedAt: b.provider.telegramVerifiedAt?.toISOString() ?? null,
      },
    })),
  });
}
