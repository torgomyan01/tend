import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** Google / OAuth users have no password yet — set one without currentPassword. */
const setSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBlocked: true, passwordHash: true },
  });

  if (!me || me.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);

  // First-time password for Google-only accounts
  if (!me.passwordHash) {
    const parsed = setSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: hashPassword(parsed.data.newPassword) },
    });

    return NextResponse.json({ ok: true, mode: "set" });
  }

  const parsed = changeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (!verifyPassword(parsed.data.currentPassword, me.passwordHash)) {
    return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ ok: true, mode: "change" });
}
