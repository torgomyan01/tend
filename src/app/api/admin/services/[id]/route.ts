import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const updateServiceSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const target = await prisma.service.findUnique({
    where: { id },
    select: { id: true, categoryId: true, title: true },
  });
  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const nextCategoryId = parsed.data.categoryId ?? target.categoryId;
  const nextTitle = parsed.data.title ?? target.title;

  if (nextCategoryId !== target.categoryId || nextTitle !== target.title) {
    const taken = await prisma.service.findFirst({
      where: {
        categoryId: nextCategoryId,
        title: nextTitle,
        NOT: { id },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "TITLE_TAKEN" }, { status: 409 });
    }
  }

  await prisma.service.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.service.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
