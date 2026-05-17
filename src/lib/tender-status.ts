import type { BidStatus, TenderStatus } from "@/generated/prisma/client";

export const TENDER_STATUS_LABEL: Record<TenderStatus, string> = {
  DRAFT: "Սևագիր",
  ACTIVE: "Ակտիվ",
  REVIEW: "Քննարկում",
  AWARDED: "Հանձնված",
  COMPLETED: "Ավարտված",
  CANCELLED: "Չեղարկված",
  EXPIRED_UNAWARDED: "Ժամկետանց · կատարող չընտրված",
};

export const TENDER_STATUS_BADGE: Record<TenderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REVIEW: "bg-amber-100 text-amber-800",
  AWARDED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-slate-200 text-slate-800",
  CANCELLED: "bg-rose-100 text-rose-700",
  EXPIRED_UNAWARDED: "bg-orange-100 text-orange-900",
};

export const BID_STATUS_LABEL: Record<BidStatus, string> = {
  PENDING: "Սպասման մեջ",
  SHORTLISTED: "Նախընտրելի",
  ACCEPTED: "Ընդունված",
  REJECTED: "Մերժված",
  WITHDRAWN: "Հետ կանչված",
};

export const BID_STATUS_BADGE: Record<BidStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SHORTLISTED: "bg-sky-100 text-sky-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-200 text-slate-600",
};
