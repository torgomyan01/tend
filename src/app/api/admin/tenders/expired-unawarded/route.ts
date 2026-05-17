import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import {
  findEligibleExpiredUnawardedTenders,
  getRepeatOffenderPublishers,
  runExpiredUnawardedCheck,
} from "@/lib/expired-unawarded";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const [eligible, repeatOffenders] = await Promise.all([
    findEligibleExpiredUnawardedTenders(),
    getRepeatOffenderPublishers(),
  ]);

  return NextResponse.json({
    eligible: eligible.map((t) => ({
      id: t.id,
      title: t.title,
      endsAt: t.endsAt?.toISOString() ?? null,
      paidBidCount: t.paidBidCount,
      client: t.client,
    })),
    eligibleCount: eligible.length,
    repeatOffenders,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await runExpiredUnawardedCheck(session.user.id);
  const repeatOffenders = await getRepeatOffenderPublishers();

  return NextResponse.json({
    ...result,
    repeatOffenders,
  });
}
