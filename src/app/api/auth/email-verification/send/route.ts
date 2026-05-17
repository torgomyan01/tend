import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { issueAndSendEmailVerification } from "@/lib/email/verify-email";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  let userId = session?.user?.id;

  if (!userId && parsed.data.userId) {
    const pending = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, emailVerified: true, telegramVerifiedAt: true },
    });
    if (pending && !pending.emailVerified && !pending.telegramVerifiedAt) {
      userId = pending.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const result = await issueAndSendEmailVerification(userId);

  if (!result.ok) {
    const status =
      result.error === "ALREADY_VERIFIED"
        ? 400
        : result.error === "NO_EMAIL"
          ? 400
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    email: result.email,
    expiresAt: result.expiresAt,
  });
}
