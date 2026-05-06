import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Params) {
  const { id: tenderId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  await prisma.tenderLike.upsert({
    where: { userId_tenderId: { userId, tenderId } },
    create: { userId, tenderId },
    update: {},
  });

  return NextResponse.json({ liked: true });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id: tenderId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  await prisma.tenderLike.deleteMany({ where: { userId, tenderId } });
  return NextResponse.json({ liked: false });
}

