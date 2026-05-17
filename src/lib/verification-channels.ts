import { z } from "zod";

export const VERIFICATION_CHANNEL_VALUES = ["TELEGRAM", "EMAIL"] as const;
export const NOTIFICATION_CHANNEL_VALUES = ["TELEGRAM", "EMAIL", "BOTH"] as const;

export type VerificationChannelValue =
  (typeof VERIFICATION_CHANNEL_VALUES)[number];
export type NotificationChannelValue =
  (typeof NOTIFICATION_CHANNEL_VALUES)[number];

export const verificationChannelSchema = z.enum(VERIFICATION_CHANNEL_VALUES);
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNEL_VALUES);
