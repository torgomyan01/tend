"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

const POLL_MS = 12_000;

type Props = {
  isLoggedIn: boolean;
  className?: string;
};

export function MessagesNavLink({ isLoggedIn, className }: Props) {
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/messages/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void load();
    if (!isLoggedIn) return;
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoggedIn, load]);

  if (!isLoggedIn) return null;

  return (
    <Link
      href={ROUTES.messages}
      aria-label={
        unread > 0
          ? `Հաղորդագրություններ · ${unread} չկարդացված`
          : "Հաղորդագրություններ"
      }
      className={`relative grid size-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}
    >
      <MessageSquare className="size-5" />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black leading-4 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
