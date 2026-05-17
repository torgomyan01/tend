import { randomBytes } from "node:crypto";
import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { renderVerifyEmailTemplate } from "@/lib/email/templates/verify-email";
import { trySendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";

export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function createEmailVerifyToken() {
  return randomBytes(32).toString("hex");
}

export async function issueAndSendEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (!user?.email) {
    return { ok: false as const, error: "NO_EMAIL" as const };
  }

  if (user.emailVerified) {
    return { ok: false as const, error: "ALREADY_VERIFIED" as const };
  }

  const token = createEmailVerifyToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: expiresAt,
    },
  });

  const verifyUrl = absoluteAppUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  const html = renderVerifyEmailTemplate({
    name: user.name,
    verifyUrl,
  });

  const sent = await trySendEmail({
    to: user.email,
    subject: "Հաստատեք ձեր Tend.am հաշիվը",
    html,
  });

  if (!sent) {
    return { ok: false as const, error: "SEND_FAILED" as const };
  }

  return {
    ok: true as const,
    expiresAt: expiresAt.toISOString(),
    email: user.email,
  };
}

export async function verifyEmailByToken(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      verificationChannel: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
      verificationChannel: user.verificationChannel ?? "EMAIL",
    },
  });

  return { ok: true as const, userId: user.id };
}
