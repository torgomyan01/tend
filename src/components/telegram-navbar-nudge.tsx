"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/lib/routes";

type Props = {
  className?: string;
};

/**
 * Navbar reminder when the signed-in user has not linked Telegram yet.
 */
export function TelegramNavbarNudge({ className = "" }: Props) {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  if (session.user.telegramVerified) {
    return null;
  }

  return (
    <Link
      href={ROUTES.accountVerifyTelegram}
      title="Միացրեք Telegram-ը"
      aria-label="Telegram-ը դեռ կցված չէ։ Սեղմեք միացնելու համար։"
      className={`relative inline-flex size-11 items-center justify-center rounded-2xl bg-white text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-md ${className}`}
    >
      <Send className="size-4" />
      <span
        className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white"
        aria-hidden
      />
    </Link>
  );
}
