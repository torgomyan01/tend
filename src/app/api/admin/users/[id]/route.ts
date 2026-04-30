import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value === "" ? null : value)),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(8).max(32).optional(),
  password: z
    .string()
    .min(6)
    .max(120)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
  walletBalance: z.number().min(0).optional(),
  isVerified: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
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
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, phone: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const data = parsed.data;

  if (id === session.user.id && data.role && data.role !== target.role) {
    return NextResponse.json(
      { error: "CANNOT_CHANGE_OWN_ROLE" },
      { status: 400 },
    );
  }

  if (id === session.user.id && data.isBlocked === true) {
    return NextResponse.json(
      { error: "CANNOT_BLOCK_SELF" },
      { status: 400 },
    );
  }

  if (data.email && data.email !== target.email) {
    const taken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }
  }

  if (data.phone && data.phone !== target.phone) {
    const taken = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "PHONE_TAKEN" }, { status: 409 });
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.password
        ? { passwordHash: hashPassword(data.password) }
        : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.walletBalance !== undefined
        ? { walletBalance: data.walletBalance }
        : {}),
      ...(data.isVerified !== undefined
        ? { isVerified: data.isVerified }
        : {}),
      ...(data.isBlocked !== undefined
        ? { isBlocked: data.isBlocked }
        : {}),
    },
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

  if (id === session.user.id) {
    return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
