"use client";

import { Send, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

const DISMISS_KEY = "tend.telegram-nudge.dismissed";

export function TelegramConnectBanner() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const { accountVerified, telegramVerified } = session.user;
  if (!accountVerified || telegramVerified || dismissed) {
    return null;
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm font-semibold leading-6 text-amber-950">
          <span className="font-black">Արագ ծանուցումներ.</span> Միացեք Telegram-ին՝
          նոր մրցույթների մասին ավելի արագ տեղեկանալու համար։
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={ROUTES.accountVerifyTelegram}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
          >
            <Send className="size-3.5" />
            Միացնել Telegram
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="grid size-9 place-items-center rounded-full text-amber-900/70 transition hover:bg-amber-100"
            aria-label="Փակել"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
