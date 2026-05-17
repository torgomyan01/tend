import type { UserNotificationCategory } from "@/generated/prisma/client";

export const NOTIFICATION_KINDS = {
  NEW_BID: "NEW_BID",
  BID_MODERATION_APPROVED: "BID_MODERATION_APPROVED",
  TENDER_STATUS_CHANGE: "TENDER_STATUS_CHANGE",
  TENDER_PUBLISHED_SECTOR: "TENDER_PUBLISHED_SECTOR",
  TENDER_ADMIN_MESSAGE: "TENDER_ADMIN_MESSAGE",
  TENDER_DELETED: "TENDER_DELETED",
  PROVIDER_AWARDED: "PROVIDER_AWARDED",
  TENDER_COMPLETED: "TENDER_COMPLETED",
  BID_FEE_REFUND: "BID_FEE_REFUND",
  OWNER_SHARED_CONTACT: "OWNER_SHARED_CONTACT",
  COMPLAINT_DECISION: "COMPLAINT_DECISION",
  SUPPORT_REPLY: "SUPPORT_REPLY",
  EXPIRED_UNAWARDED_PENALTY: "EXPIRED_UNAWARDED_PENALTY",
} as const;

export type NotificationKind =
  (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

export type InAppNotificationInput = {
  category: UserNotificationCategory;
  kind: NotificationKind | string;
  title: string;
  body: string;
  href?: string;
  tenderId?: string;
  bidId?: string;
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  UserNotificationCategory,
  string
> = {
  APPROVED: "Հաստատված",
  PENDING: "Սպասման",
  REJECTED: "Մերժված",
  INFO: "Նշազգուշացում",
};

export const NOTIFICATION_FILTER_TABS = [
  { id: "all" as const, label: "Բոլորը" },
  { id: "unread" as const, label: "Չկարդացված" },
  { id: "APPROVED" as const, label: NOTIFICATION_CATEGORY_LABELS.APPROVED },
  { id: "PENDING" as const, label: NOTIFICATION_CATEGORY_LABELS.PENDING },
  { id: "REJECTED" as const, label: NOTIFICATION_CATEGORY_LABELS.REJECTED },
  { id: "INFO" as const, label: NOTIFICATION_CATEGORY_LABELS.INFO },
];

export type NotificationFilterTab = (typeof NOTIFICATION_FILTER_TABS)[number]["id"];
