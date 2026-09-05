"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type Props = {
  isLoggedIn: boolean;
  className?: string;
};

/** Navbar shortcut to the wallet page (mobile + desktop). */
export function WalletDropdown({ isLoggedIn, className = "" }: Props) {
  if (!isLoggedIn) {
    return null;
  }

  return (
    <Link
      href={ROUTES.accountWallet}
      title="Դրամապանակ"
      aria-label="Բացել դրամապանակը"
      className={`relative inline-flex size-11 items-center justify-center rounded-2xl bg-white text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-md ${className}`}
    >
      <Wallet className="size-4" />
    </Link>
  );
}
