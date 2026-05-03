import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Անունը առնվազն 2 նիշ պետք է լինի").max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(32),
});

async function ensureAccountUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isBlocked: true },
  });
  if (!user || user.isBlocked) {
    return null;
  }
  return user;
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const ok = await ensureAccountUser(session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const phone = parsed.data.phone.trim();

  const conflict = await prisma.user.findFirst({
    where: {
      NOT: { id: session.user.id },
      OR: [{ email: normalizedEmail }, { phone }],
    },
    select: { id: true },
  });

  if (conflict) {
    return NextResponse.json({ error: "EMAIL_OR_PHONE_TAKEN" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name.trim(),
      email: normalizedEmail,
      phone,
    },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: updated,
  });
}
