import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const createServiceSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const category = await prisma.serviceCategory.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
  }

  const existing = await prisma.service.findUnique({
    where: {
      categoryId_title: {
        categoryId: parsed.data.categoryId,
        title: parsed.data.title,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "TITLE_TAKEN" }, { status: 409 });
  }

  const lastSortOrder =
    parsed.data.sortOrder ??
    (
      (
        await prisma.service.aggregate({
          _max: { sortOrder: true },
          where: { categoryId: parsed.data.categoryId },
        })
      )?._max?.sortOrder ?? -1
    ) + 1;

  const service = await prisma.service.create({
    data: {
      categoryId: parsed.data.categoryId,
      title: parsed.data.title,
      sortOrder: lastSortOrder,
      isActive: parsed.data.isActive ?? true,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: service.id });
}
