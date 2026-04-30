import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getTelegramBotUrl } from "@/lib/telegram";

const interestSchema = z.object({
  category: z.string().trim().min(1).max(160),
  service: z.string().trim().min(1).max(200),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z.string().trim().min(8, "Phone is required").max(32),
  email: z.string().trim().email("Invalid email").max(160),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptedTerms: z.literal(true),
  interests: z.array(interestSchema).max(200).optional().default([]),
});

function createTelegramToken() {
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = registerSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsedBody.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, phone, email, password, interests } = parsedBody.data;
  const normalizedEmail = email.toLowerCase();
  const uniqueInterests = Array.from(
    new Map(
      interests.map((interest) => [
        `${interest.category}::${interest.service}`,
        interest,
      ]),
    ).values(),
  );
  const telegramLinkToken = createTelegramToken();
  const telegramLinkTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone }],
    },
  });

  if (existingUser?.telegramVerifiedAt) {
    return NextResponse.json(
      { error: "USER_ALREADY_EXISTS" },
      { status: 409 },
    );
  }

  if (
    existingUser &&
    (existingUser.email !== normalizedEmail || existingUser.phone !== phone)
  ) {
    return NextResponse.json(
      { error: "EMAIL_OR_PHONE_ALREADY_USED" },
      { status: 409 },
    );
  }

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          phone,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
          telegramLinkToken,
          telegramLinkTokenExpiresAt,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          name,
          phone,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
          telegramLinkToken,
          telegramLinkTokenExpiresAt,
        },
        select: { id: true },
      });

  if (existingUser) {
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
  }

  if (uniqueInterests.length > 0) {
    await prisma.userInterest.createMany({
      data: uniqueInterests.map((interest) => ({
        userId: user.id,
        category: interest.category,
        service: interest.service,
      })),
    });
  }

  return NextResponse.json({
    userId: user.id,
    telegramBotUrl: getTelegramBotUrl(telegramLinkToken),
    expiresAt: telegramLinkTokenExpiresAt.toISOString(),
  });
}
