import { Building2, User } from "lucide-react";
import {
  ACCOUNT_TYPE_LABEL,
  type AccountTypeValue,
  isLegalEntity,
} from "@/lib/account-type";

type Props = {
  accountType: AccountTypeValue | null | undefined;
  size?: "sm" | "md";
  className?: string;
};

export function AccountTypeBadge({ accountType, size = "sm", className }: Props) {
  if (!accountType) return null;
  const isLegal = isLegalEntity(accountType);
  const Icon = isLegal ? Building2 : User;
  const label = ACCOUNT_TYPE_LABEL[accountType];

  const sizeClass =
    size === "md"
      ? "px-3 py-1.5 text-xs"
      : "px-2.5 py-0.5 text-[10px]";

  const colorClass = isLegal
    ? "bg-amber-100 text-amber-900 ring-amber-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black ring-1 ${sizeClass} ${colorClass} ${className ?? ""}`}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} />
      {label}
    </span>
  );
}
