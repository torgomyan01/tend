import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCOUNT_TYPE_VALUES,
  LEGAL_FORM_VALUES,
} from "@/lib/account-type";
import { hashPassword } from "@/lib/password";
import {
  formatArmenianPhoneDisplay,
  isValidArmenianPhone,
  maskArmenianPhone,
  phonesMatch,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { isAccountVerified } from "@/lib/account-verification";
import { issueAndSendEmailVerification } from "@/lib/email/verify-email";
import {
  createTelegramLinkToken,
  TELEGRAM_LINK_TTL_MS,
} from "@/lib/telegram-link";
import { getTelegramBotUrl } from "@/lib/telegram";
import {
  notificationChannelSchema,
  verificationChannelSchema,
} from "@/lib/verification-channels";

const interestSchema = z.object({
  category: z.string().trim().min(1).max(160),
  service: z.string().trim().min(1).max(200),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120),
    phone: z.string().trim().min(8, "Phone is required").max(32),
    email: z.string().trim().email("Invalid email").max(160),
    password: z.string().min(8, "Password must be at least 8 characters"),
    acceptedTerms: z.literal(true),
    interests: z.array(interestSchema).max(200).optional().default([]),
    accountType: z.enum(ACCOUNT_TYPE_VALUES).default("INDIVIDUAL"),
    companyName: z.string().trim().max(200).optional().nullable(),
    legalForm: z.enum(LEGAL_FORM_VALUES).optional().nullable(),
    taxId: z.string().trim().max(20).optional().nullable(),
    legalAddress: z.string().trim().max(500).optional().nullable(),
    directorName: z.string().trim().max(200).optional().nullable(),
    companyPhone: z.string().trim().max(32).optional().nullable(),
    verificationChannel: verificationChannelSchema,
    notificationChannel: notificationChannelSchema,
  })
  .superRefine((data, ctx) => {
    if (data.accountType !== "LEGAL_ENTITY") return;
    const required: Array<["companyName" | "legalForm" | "taxId" | "legalAddress" | "directorName", string]> = [
      ["companyName", "Ընկերության անվանումը պարտադիր է"],
      ["legalForm", "Իրավաբանական ձևը պարտադիր է"],
      ["taxId", "ՀՎՀՀ-ն պարտադիր է"],
      ["legalAddress", "Իրավաբանական հասցեն պարտադիր է"],
      ["directorName", "Տնօրենի անունը պարտադիր է"],
    ];
    for (const [field, message] of required) {
      const value = data[field];
      if (!value || (typeof value === "string" && value.trim().length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message,
        });
      }
    }
  });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = registerSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsedBody.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    name,
    phone,
    email,
    password,
    interests,
    accountType,
    companyName,
    legalForm,
    taxId,
    legalAddress,
    directorName,
    companyPhone,
    verificationChannel,
    notificationChannel,
  } = parsedBody.data;
  const normalizedEmail = email.toLowerCase();
  if (!isValidArmenianPhone(phone)) {
    return NextResponse.json(
      {
        error: "INVALID_PHONE",
        issues: { phone: ["Օգտագործեք հայկական ձևաչափը՝ +374 77 123 456"] },
      },
      { status: 400 },
    );
  }
  const normalizedPhone = formatArmenianPhoneDisplay(phone);
  const isLegal = accountType === "LEGAL_ENTITY";
  const legalFields = {
    accountType,
    companyName: isLegal ? companyName?.trim() || null : null,
    legalForm: isLegal ? legalForm ?? null : null,
    taxId: isLegal ? taxId?.trim() || null : null,
    legalAddress: isLegal ? legalAddress?.trim() || null : null,
    directorName: isLegal ? directorName?.trim() || null : null,
    companyPhone: isLegal ? companyPhone?.trim() || null : null,
  };
  const uniqueInterests = Array.from(
    new Map(
      interests.map((interest) => [
        `${interest.category}::${interest.service}`,
        interest,
      ]),
    ).values(),
  );
  const telegramLinkToken = createTelegramLinkToken();
  const telegramLinkTokenExpiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MS);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    },
    select: {
      id: true,
      email: true,
      phone: true,
      telegramVerifiedAt: true,
      emailVerified: true,
    },
  });

  if (existingUser && isAccountVerified(existingUser)) {
    return NextResponse.json(
      { error: "USER_ALREADY_EXISTS" },
      { status: 409 },
    );
  }

  if (
    existingUser &&
    (existingUser.email !== normalizedEmail ||
      !(existingUser.phone && phonesMatch(existingUser.phone, normalizedPhone)))
  ) {
    return NextResponse.json(
      { error: "EMAIL_OR_PHONE_ALREADY_USED" },
      { status: 409 },
    );
  }

  const sharedUserData = {
    name,
    phone: normalizedPhone,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    verificationChannel,
    notificationChannel,
    emailVerified: null,
    emailVerifyToken: null,
    emailVerifyTokenExpiresAt: null,
    telegramLinkToken:
      verificationChannel === "TELEGRAM" ? telegramLinkToken : null,
    telegramLinkTokenExpiresAt:
      verificationChannel === "TELEGRAM"
        ? telegramLinkTokenExpiresAt
        : null,
    telegramChatId: null,
    telegramVerifiedAt: null,
    ...legalFields,
  };

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: sharedUserData,
        select: { id: true, email: true },
      })
    : await prisma.user.create({
        data: sharedUserData,
        select: { id: true, email: true },
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

  if (verificationChannel === "EMAIL") {
    const emailResult = await issueAndSendEmailVerification(user.id);
    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error === "SEND_FAILED" ? "EMAIL_SEND_FAILED" : emailResult.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      userId: user.id,
      verificationChannel: "EMAIL",
      email: user.email,
      emailSent: true,
      phoneMasked: maskArmenianPhone(normalizedPhone),
    });
  }

  return NextResponse.json({
    userId: user.id,
    verificationChannel: "TELEGRAM",
    telegramBotUrl: getTelegramBotUrl(telegramLinkToken),
    expiresAt: telegramLinkTokenExpiresAt.toISOString(),
    phoneMasked: maskArmenianPhone(normalizedPhone),
  });
}
