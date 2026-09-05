import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  formatArmenianPhoneDisplay,
  isValidArmenianPhone,
  normalizeArmenianPhone,
  phonesMatch,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { maskArmenianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(8).max(32),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (!isValidArmenianPhone(parsed.data.phone)) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const phone = formatArmenianPhoneDisplay(parsed.data.phone);
  const normalized = normalizeArmenianPhone(parsed.data.phone)!;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, phone: true, isBlocked: true },
  });

  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (user.phone && phonesMatch(user.phone, phone)) {
    return NextResponse.json({
      ok: true,
      phone: user.phone,
      phoneMasked: maskArmenianPhone(user.phone),
      unchanged: true,
    });
  }

  const conflict = await prisma.user.findFirst({
    where: {
      NOT: { id: user.id },
      OR: [{ phone }, { phone: normalized }],
    },
    select: { id: true },
  });

  if (conflict) {
    return NextResponse.json({ error: "PHONE_TAKEN" }, { status: 409 });
  }

  const phoneChanged = Boolean(user.phone);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      phone,
      ...(phoneChanged
        ? { telegramVerifiedAt: null, telegramChatId: null }
        : {}),
    },
    select: { phone: true },
  });

  return NextResponse.json({
    ok: true,
    phone: updated.phone,
    phoneMasked: updated.phone ? maskArmenianPhone(updated.phone) : null,
  });
}
