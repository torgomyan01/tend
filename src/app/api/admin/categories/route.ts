import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const createCategorySchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(800),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const existing = await prisma.serviceCategory.findUnique({
    where: { title: parsed.data.title },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "TITLE_TAKEN" }, { status: 409 });
  }

  const lastSortOrder =
    parsed.data.sortOrder ??
    (
      (
        await prisma.serviceCategory.aggregate({
          _max: { sortOrder: true },
        })
      )?._max?.sortOrder ?? -1
    ) + 1;

  const category = await prisma.serviceCategory.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: lastSortOrder,
      isActive: parsed.data.isActive ?? true,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: category.id });
}
