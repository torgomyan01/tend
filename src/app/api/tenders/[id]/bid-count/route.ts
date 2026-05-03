import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const tender = await prisma.tender.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!tender) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const count = await prisma.bid.count({
    where: { tenderId: id },
  });

  return NextResponse.json({ count });
}
