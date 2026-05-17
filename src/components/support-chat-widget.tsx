"use client";

import {
  Headphones,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Attachment = {
  id: string;
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

type ChatMessage = {
  id: string;
  sender: "USER" | "STAFF";
  body: string;
  createdAt: string;
  attachments: Attachment[];
  staff: { id: string; name: string | null; role: string } | null;
};

const POLL_MS = 10_000;

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function SupportChatWidget() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPreview, setUnreadPreview] = useState<ChatMessage | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  const isLoggedIn = status === "authenticated" && Boolean(session?.user?.id);
  const hideOnAdmin = pathname.startsWith("/admin");
  const showDebug = process.env.NODE_ENV === "development";

  useEffect(() => {
    lastMessageAtRef.current = messages.at(-1)?.createdAt ?? null;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(
    async (markRead: boolean) => {
      if (!isLoggedIn) return;
      try {
        const last = lastMessageAtRef.current;
        const url = last
          ? `/api/support/messages?after=${encodeURIComponent(last)}`
          : "/api/support/messages";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages?: ChatMessage[];
          unreadCount?: number;
          latestUnread?: ChatMessage | null;
        };
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of data.messages!) {
              if (!ids.has(m.id)) merged.push(m);
            }
            return merged.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          });
        } else if (!last) {
          setMessages(data.messages ?? []);
        }
        if (!open) {
          setUnreadCount(data.unreadCount ?? 0);
          if ((data.unreadCount ?? 0) > 0 && data.latestUnread) {
            setUnreadPreview(data.latestUnread);
          } else if ((data.unreadCount ?? 0) === 0) {
            setUnreadPreview(null);
          }
        }
        if (markRead && open) {
          await fetch("/api/support/read", { method: "PATCH" });
          setUnreadCount(0);
        }
      } catch {
        /* ignore */
      }
    },
    [isLoggedIn, open],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/messages", { cache: "no-store" });
      if (!res.ok) {
        setError("Չհաջողվեց բեռնել զրույցը։");
        return;
      }
      const data = (await res.json()) as {
        messages?: ChatMessage[];
        unreadCount?: number;
      };
      setMessages(data.messages ?? []);
      setUnreadCount(0);
      setUnreadPreview(null);
      await fetch("/api/support/read", { method: "PATCH" });
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadStatus = useCallback(async () => {
    if (!isLoggedIn || open) return;
    try {
      const res = await fetch("/api/support/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unreadCount?: number;
        latestUnread?: ChatMessage | null;
      };
      const count = data.unreadCount ?? 0;
      setUnreadCount(count);
      if (count > 0 && data.latestUnread) {
        setUnreadPreview(data.latestUnread);
      } else {
        setUnreadPreview(null);
      }
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, open]);

  useEffect(() => {
    if (!isLoggedIn || hideOnAdmin) return;
    void fetchUnreadStatus();
  }, [isLoggedIn, hideOnAdmin, fetchUnreadStatus]);

  useEffect(() => {
    if (!isLoggedIn || hideOnAdmin || open) return;
    const id = window.setInterval(() => void fetchUnreadStatus(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoggedIn, hideOnAdmin, open, fetchUnreadStatus]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    void loadInitial();
  }, [open, isLoggedIn, loadInitial]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    const id = window.setInterval(() => void fetchMessages(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [open, isLoggedIn, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("body", trimmed);
      for (const file of files) {
        formData.append("files", file);
      }
      const res = await fetch("/api/support/messages", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { error?: string; message?: ChatMessage };
      if (!res.ok) {
        setError(
          data.error === "INVALID_FILE"
            ? "Ֆայլը թույլատրելի չէ (մինչև 5 MB, jpg/png/webp/pdf/word/txt)։"
            : "Չուղարկվեց։ Փորձեք նորից։",
        );
        return;
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setText("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setSending(false);
    }
  }

  if (!isLoggedIn || hideOnAdmin) {
    return null;
  }

  const hasUnreadClosed = !open && unreadCount > 0;

  return (
    <>
      {hasUnreadClosed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-[min(100vw-2rem,320px)] rounded-2xl border border-amber-300 bg-amber-50 p-3 text-left shadow-xl shadow-amber-900/10 ring-2 ring-amber-400/50 transition hover:bg-amber-100 sm:right-6"
          aria-label="Բացել նոր պատասխանը"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
            Նոր պատասխան · {unreadCount > 9 ? "9+" : unreadCount}
          </p>
          {unreadPreview ? (
            <>
              {unreadPreview.staff?.name ? (
                <p className="mt-1 text-xs font-black text-slate-700">
                  {unreadPreview.staff.name}
                </p>
              ) : null}
              <p className="mt-0.5 line-clamp-3 text-sm font-semibold leading-relaxed text-slate-800">
                {unreadPreview.body.trim() ||
                  (unreadPreview.attachments.length > 0
                    ? `📎 ${unreadPreview.attachments.length} ֆայլ`
                    : "Նոր հաղորդագրություն")}
              </p>
              {showDebug ? (
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-slate-500">
                  id:{unreadPreview.id.slice(-8)} · STAFF
                  <br />
                  {new Date(unreadPreview.createdAt).toLocaleString("hy-AM")}
                  {unreadPreview.attachments.length > 0
                    ? ` · files:${unreadPreview.attachments.length}`
                    : ""}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Սեղմեք՝ զրույցը բացելու համար
            </p>
          )}
          {showDebug ? (
            <p className="mt-2 border-t border-amber-200/80 pt-2 text-center text-[10px] font-semibold text-amber-700/80">
              Debug — support unread preview
            </p>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Աջակցություն"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full text-white shadow-2xl transition hover:scale-105 sm:bottom-6 sm:right-6 ${
          hasUnreadClosed
            ? "bg-amber-600 shadow-amber-900/30 ring-4 ring-amber-300 animate-pulse hover:bg-amber-500"
            : "bg-slate-950 shadow-slate-950/30 ring-4 ring-amber-400/40 hover:bg-slate-800"
        }`}
      >
        {open ? <X className="size-6" /> : <Headphones className="size-6" />}
        {hasUnreadClosed ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-[#f7f4ee]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed bottom-24 right-4 z-50 flex h-[min(520px,calc(100vh-7rem))] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200 sm:right-6"
          role="dialog"
          aria-label="Աջակցության չատ"
        >
          <header className="border-b border-slate-100 bg-linear-to-r from-slate-950 to-slate-800 px-4 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              Աջակցություն
            </p>
            <h2 className="mt-1 text-lg font-black">Գրեք մեզ</h2>
            <p className="mt-1 text-xs font-semibold text-slate-300">
              Կպատասխանենք հնարավորինս արագ
            </p>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[#f7f4ee]/50 p-4"
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                Սկսեք զրույցը՝ գրեք հարցը կամ կցեք ֆայլ։
              </p>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === "USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        isUser
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-800 ring-1 ring-slate-200"
                      }`}
                    >
                      {!isUser && msg.staff?.name ? (
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                          {msg.staff.name}
                        </p>
                      ) : null}
                      {msg.body.trim() ? (
                        <p className="whitespace-pre-wrap font-semibold leading-relaxed">
                          {msg.body.trim()}
                        </p>
                      ) : null}
                      {msg.attachments.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {msg.attachments.map((att) => (
                            <li key={att.id}>
                              {isImageMime(att.mimeType) ? (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl ring-1 ring-white/20"
                                >
                                  <Image
                                    src={att.url}
                                    alt={att.originalFileName}
                                    width={240}
                                    height={160}
                                    className="max-h-40 w-full object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex text-xs font-black underline ${
                                    isUser ? "text-amber-200" : "text-amber-800"
                                  }`}
                                >
                                  {att.originalFileName}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
              {error}
            </p>
          ) : null}

          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2">
              {files.map((f) => (
                <span
                  key={`${f.name}-${f.size}`}
                  className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
                >
                  {f.name}
                </span>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => void handleSend(e)}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,image/*,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setFiles(picked.slice(0, 5));
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="Կցել ֆայլ"
              >
                <Paperclip className="size-4" />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Գրեք հաղորդագրությունը…"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
              <button
                type="submit"
                disabled={sending}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-60"
                aria-label="Ուղարկել"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
