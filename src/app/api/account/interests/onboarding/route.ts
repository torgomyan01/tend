import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

/**
 * Google OAuth գրանցումից հետո՝ ոլորտ/ծառայություն ընտրության անհրաժեշտություն։
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ needsOnboarding: false });
  }

  const userId = session.user.id;

  const [googleAccount, interestCount] = await Promise.all([
    prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true },
    }),
    prisma.userInterest.count({ where: { userId } }),
  ]);

  const needsOnboarding = Boolean(googleAccount) && interestCount === 0;

  if (!needsOnboarding) {
    return NextResponse.json({ needsOnboarding: false });
  }

  const categories = await getServiceCategories();

  return NextResponse.json({
    needsOnboarding: true,
    categories,
  });
}
