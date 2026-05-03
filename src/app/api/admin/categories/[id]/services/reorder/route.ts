import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  orderedServiceIds: z.array(z.string().min(1)),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id: categoryId } = await params;

  const category = await prisma.serviceCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { orderedServiceIds } = parsed.data;

  const existing = await prisma.service.findMany({
    where: { categoryId },
    select: { id: true },
  });

  if (existing.length !== orderedServiceIds.length) {
    return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });
  }

  const dbIds = new Set(existing.map((s) => s.id));
  for (const sid of orderedServiceIds) {
    if (!dbIds.has(sid)) {
      return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    orderedServiceIds.map((serviceId, index) =>
      prisma.service.update({
        where: { id: serviceId },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
