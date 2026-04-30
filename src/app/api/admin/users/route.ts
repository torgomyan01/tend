import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(8).max(32),
  password: z.string().min(6).max(120),
  role: z.enum(["USER", "MODERATOR", "ADMIN"]),
  walletBalance: z.number().min(0).optional(),
  isVerified: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
    select: { id: true, email: true, phone: true },
  });

  if (existing) {
    const conflictField =
      existing.email === data.email ? "EMAIL_TAKEN" : "PHONE_TAKEN";
    return NextResponse.json({ error: conflictField }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: data.name ?? null,
      email: data.email,
      phone: data.phone,
      passwordHash: hashPassword(data.password),
      role: data.role,
      walletBalance: data.walletBalance ?? 0,
      isVerified: data.isVerified ?? false,
      isBlocked: data.isBlocked ?? false,
      telegramVerifiedAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: user.id });
}
