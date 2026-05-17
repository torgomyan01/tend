"use client";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_FILTER_TABS,
  type NotificationFilterTab,
} from "@/lib/notifications/in-app";

type NotificationItem = {
  id: string;
  category: keyof typeof NOTIFICATION_CATEGORY_LABELS;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  tenderId: string | null;
  bidId: string | null;
  readAt: string | null;
  isRead: boolean;
  sentTelegram: boolean;
  sentEmail: boolean;
  createdAt: string;
};

type Props = {
  isLoggedIn: boolean;
  /** false = ցույց տալ նաև mobile-ում */
  className?: string;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "հիմա";
  if (mins < 60) return `${mins} րոպե առաջ`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ժ առաջ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} օր առաջ`;
  return date.toLocaleDateString("hy-AM", {
    day: "numeric",
    month: "short",
  });
}

const CATEGORY_STYLES: Record<
  NotificationItem["category"],
  string
> = {
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  REJECTED: "bg-red-100 text-red-800 ring-red-200",
  INFO: "bg-sky-100 text-sky-800 ring-sky-200",
};

export function NotificationsDropdown({ isLoggedIn, className = "" }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilterTab>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const showDebug = process.env.NODE_ENV === "development";

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/account/notifications?filter=${encodeURIComponent(filter)}&limit=50`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as {
        items?: NotificationItem[];
        unreadCount?: number;
      };
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, filter]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/account/notifications/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    void fetchUnreadCount();
    const id = window.setInterval(() => void fetchUnreadCount(), 30_000);
    return () => window.clearInterval(id);
  }, [isLoggedIn, fetchUnreadCount]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    void fetchNotifications();
  }, [open, isLoggedIn, fetchNotifications]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function markRead(ids: string[]) {
    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read: true }),
    });
    await fetchNotifications();
    void fetchUnreadCount();
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true, read: true }),
      });
      await fetchNotifications();
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleItemClick(item: NotificationItem) {
    if (!item.isRead) {
      void markRead([item.id]);
    }
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Ծանուցումներ"
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-[#f7f4ee]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        <ChevronDown
          className={`absolute -bottom-1 -right-1 size-3 rounded-full bg-white text-slate-400 ring-1 ring-slate-200 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-[4.25rem] z-50 box-border flex w-[calc(100vw-1.5rem)] max-w-none flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-3 md:w-[min(100vw-2rem,400px)] md:max-w-[400px]">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Ծանուցումներ
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} չկարդացված`
                  : "Բոլորը կարդացված են"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void markAllRead()}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {markingAll ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
                Բոլորը
              </button>
            ) : null}
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
            {NOTIFICATION_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  filter === tab.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <ul className="max-h-[min(70vh,420px)] overflow-y-auto">
            {loading ? (
              <li className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                Այս ֆիլտրով ծանուցումներ չկան։
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="border-b border-slate-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                      !item.isRead ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!item.isRead ? (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                          aria-hidden
                        />
                      ) : (
                        <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${CATEGORY_STYLES[item.category]}`}
                          >
                            {NOTIFICATION_CATEGORY_LABELS[item.category]}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-black text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-xs font-semibold leading-relaxed text-slate-600">
                          {item.body}
                        </p>
                        {showDebug ? (
                          <p className="mt-2 font-mono text-[10px] leading-relaxed text-slate-400">
                            id:{item.id.slice(-8)} · {item.kind}
                            <br />
                            TG:{item.sentTelegram ? "✓" : "—"} Email:
                            {item.sentEmail ? "✓" : "—"}
                            {item.tenderId
                              ? ` · tender:${item.tenderId.slice(-6)}`
                              : ""}
                          </p>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                            {item.sentTelegram ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Send className="size-3" /> Telegram
                              </span>
                            ) : null}
                            {item.sentEmail ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Mail className="size-3" /> Email
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>

          {showDebug ? (
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-[10px] font-semibold text-slate-400">
              Debug mode — ցուցադրվում են kind / id / ուղարկման ալիքները
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
