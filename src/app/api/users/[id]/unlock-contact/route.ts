import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PROFILE_CONTACT_UNLOCK_FEE_AMD } from "@/lib/profile-contact-unlock";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: profileUserId } = await params;
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id;

  if (!viewerId) {
    return NextResponse.json({
      unlocked: false,
      fee: PROFILE_CONTACT_UNLOCK_FEE_AMD,
      isOwnProfile: false,
      authenticated: false,
    });
  }

  if (viewerId === profileUserId) {
    return NextResponse.json({
      unlocked: true,
      fee: PROFILE_CONTACT_UNLOCK_FEE_AMD,
      isOwnProfile: true,
      authenticated: true,
    });
  }

  const [existing, viewer] = await Promise.all([
    prisma.profileContactUnlock.findUnique({
      where: {
        viewerId_profileUserId: { viewerId, profileUserId },
      },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { walletBalance: true, isBlocked: true },
    }),
  ]);

  return NextResponse.json({
    unlocked: Boolean(existing),
    fee: PROFILE_CONTACT_UNLOCK_FEE_AMD,
    isOwnProfile: false,
    authenticated: true,
    balance:
      viewer && !viewer.isBlocked ? Number(viewer.walletBalance) : null,
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: profileUserId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const viewerId = session.user.id;

  if (viewerId === profileUserId) {
    return NextResponse.json({ error: "OWN_PROFILE" }, { status: 400 });
  }

  const profileUser = await prisma.user.findUnique({
    where: { id: profileUserId },
    select: { id: true, isBlocked: true },
  });

  if (!profileUser || profileUser.isBlocked) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  }

  const existing = await prisma.profileContactUnlock.findUnique({
    where: {
      viewerId_profileUserId: { viewerId, profileUserId },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const fee = PROFILE_CONTACT_UNLOCK_FEE_AMD;

  try {
    await prisma.$transaction(async (tx) => {
      const viewer = await tx.user.findUnique({
        where: { id: viewerId },
        select: { walletBalance: true, isBlocked: true },
      });

      if (!viewer || viewer.isBlocked) {
        throw Object.assign(new Error("VIEWER_BLOCKED"), {
          code: "VIEWER_BLOCKED" as const,
        });
      }

      const balance = Number(viewer.walletBalance);
      if (!Number.isFinite(balance) || balance < fee) {
        throw Object.assign(new Error("INSUFFICIENT_BALANCE"), {
          code: "INSUFFICIENT_BALANCE" as const,
        });
      }

      await tx.user.update({
        where: { id: viewerId },
        data: { walletBalance: { decrement: fee } },
      });

      await tx.profileContactUnlock.create({
        data: {
          viewerId,
          profileUserId,
          amount: fee,
        },
      });

      await tx.transaction.create({
        data: {
          userId: viewerId,
          type: "PROFILE_CONTACT_UNLOCK",
          status: "SUCCEEDED",
          amount: fee,
          currency: "AMD",
          description: "Պրոֆիլի կոնտակտային տվյալների բացում",
        },
      });
    });
  } catch (error: unknown) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: string }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "INSUFFICIENT_BALANCE", fee },
        { status: 402 },
      );
    }
    if (code === "VIEWER_BLOCKED") {
      return NextResponse.json({ error: "USER_BLOCKED" }, { status: 403 });
    }
    throw error;
  }

  const updated = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { walletBalance: true },
  });

  return NextResponse.json({
    ok: true,
    balance: updated ? Number(updated.walletBalance) : null,
  });
}
