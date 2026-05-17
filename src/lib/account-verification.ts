import type { User } from "@/generated/prisma/client";

type VerificationFields = {
  telegramVerifiedAt?: Date | string | null;
  emailVerified?: Date | string | null;
};

export function isTelegramVerified(user: VerificationFields): boolean {
  return Boolean(user.telegramVerifiedAt);
}

export function isEmailVerified(user: VerificationFields): boolean {
  return Boolean(user.emailVerified);
}

/** Հաշիվը ակտիվ է Telegram կամ Email վերիֆիկացումից հետո։ */
export function isAccountVerified(user: VerificationFields): boolean {
  return isTelegramVerified(user) || isEmailVerified(user);
}

export function shouldShowTelegramConnectNudge(user: VerificationFields): boolean {
  return isEmailVerified(user) && !isTelegramVerified(user);
}
