"use client";

import {
  Archive,
  FileText,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError } from "@/lib/toast";

type Attachment = {
  id: string;
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Message = {
  id: string;
  kind: "TEXT" | "SYSTEM_CONTRACT";
  body: string;
  contractId: string | null;
  contractHref: string | null;
  createdAt: string;
  senderUserId: string | null;
  sender: { id: string; name: string; image: string | null } | null;
  attachments: Attachment[];
};

type ConversationListItem = {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: string | null;
  lastMessageAt: string;
  tender: { id: string; title: string };
  contractId: string;
  peer: { id: string; name: string; image: string | null };
  lastMessage: {
    id: string;
    body: string;
    kind: string;
    createdAt: string;
    senderUserId: string | null;
  } | null;
  unreadCount: number;
};

type ThreadMeta = {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: string | null;
  contractId: string;
  tender: { id: string; title: string };
  peer: { id: string; name: string; image: string | null };
  role: "client" | "provider";
};

const POLL_MS = 9_000;

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("hy-AM", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function previewText(body: string) {
  const one = body.replace(/\s+/g, " ").trim();
  return one.length > 80 ? `${one.slice(0, 80)}…` : one;
}

export function MessagesInbox() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const activeId = typeof params?.id === "string" ? params.id : null;

  const [list, setList] = useState<ConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [thread, setThread] = useState<ThreadMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    lastMessageAtRef.current = messages.at(-1)?.createdAt ?? null;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversations?: ConversationListItem[];
      };
      setList(data.conversations ?? []);
    } catch {
      /* ignore */
    } finally {
      setListLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/messages/${id}/read`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }, []);

  const loadThread = useCallback(
    async (id: string, incremental: boolean) => {
      try {
        const after = incremental ? lastMessageAtRef.current : null;
        const url = after
          ? `/api/messages/${id}?after=${encodeURIComponent(after)}`
          : `/api/messages/${id}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            setThread(null);
            setMessages([]);
          }
          return;
        }
        const data = (await res.json()) as {
          conversation: ThreadMeta;
          messages: Message[];
        };
        if (activeIdRef.current !== id) return;
        setThread(data.conversation);
        if (incremental && after) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const next = data.messages.filter((m) => !ids.has(m.id));
            return next.length ? [...prev, ...next] : prev;
          });
        } else {
          setMessages(data.messages);
        }
        void markRead(id);
      } catch {
        /* ignore */
      }
    },
    [markRead],
  );

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => {
      void loadList();
      const id = activeIdRef.current;
      if (id) void loadThread(id, true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadList, loadThread]);

  useEffect(() => {
    if (!activeId) {
      setThread(null);
      setMessages([]);
      setText("");
      setFiles([]);
      return;
    }
    setThreadLoading(true);
    lastMessageAtRef.current = null;
    void loadThread(activeId, false).finally(() => setThreadLoading(false));
  }, [activeId, loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function send() {
    if (!activeId || !thread || thread.status === "ARCHIVED") return;
    const body = text.trim();
    if (!body && files.length === 0) return;

    setSending(true);
    try {
      const form = new FormData();
      form.set("body", body);
      for (const f of files) form.append("files", f);
      const res = await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: Message;
      } | null;
      if (!res.ok) {
        const map: Record<string, string> = {
          ARCHIVED: "Զրույցը արխիվացված է։",
          EMPTY_MESSAGE: "Գրեք հաղորդագրություն կամ կցեք ֆայլ։",
          INVALID_FILE: "Ֆայլի տեսակը կամ չափը անթույլատրելի է։",
          TOO_MANY_FILES: "Առավելագույնը 5 ֆայլ։",
        };
        toastError(
          "Չհաջողվեց ուղարկել",
          map[data?.error ?? ""] ?? "Փորձեք նորից։",
        );
        return;
      }
      if (data?.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message!.id)
            ? prev
            : [...prev, data.message!],
        );
      }
      setText("");
      setFiles([]);
      void loadList();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setSending(false);
    }
  }

  const archived = thread?.status === "ARCHIVED";

  return (
    <div className="mx-auto flex h-[min(78vh,820px)] w-full max-w-6xl overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-200">
      <aside
        className={`flex w-full flex-col border-r border-slate-200 md:w-[340px] md:shrink-0 ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-4">
          <h1 className="text-lg font-black tracking-tight text-slate-950">
            Հաղորդագրություններ
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Պատվիրատու · կատարող զրույցներ
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              Դեռ զրույցներ չկան։ Զրույցը բացվում է պայմանագրի առաջարկից։
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.messageThread(c.id))}
                      className={`flex w-full gap-3 px-4 py-3.5 text-left transition ${
                        active
                          ? "bg-amber-50"
                          : "hover:bg-slate-50"
                      } ${c.status === "ARCHIVED" ? "opacity-70" : ""}`}
                    >
                      <div className="relative mt-0.5 size-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                        {c.peer.image ? (
                          <Image
                            src={c.peer.image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-sm font-black text-slate-600">
                            {c.peer.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-slate-950">
                            {c.peer.name}
                          </p>
                          {c.unreadCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs font-bold text-slate-600">
                          {c.tender.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                          {c.lastMessage
                            ? previewText(c.lastMessage.body)
                            : "—"}
                        </p>
                        {c.status === "ARCHIVED" ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                            <Archive className="size-3" />
                            Արխիվ
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section
        className={`flex min-w-0 flex-1 flex-col ${
          activeId ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-black text-slate-700">
              Ընտրեք զրույց
            </p>
            <p className="max-w-sm text-xs font-semibold text-slate-500">
              Ակտիվ զրույցները վերևում են, արխիվացվածները՝ ներքևում։
            </p>
          </div>
        ) : threadLoading && !thread ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : thread ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <button
                type="button"
                className="text-sm font-black text-slate-500 md:hidden"
                onClick={() => router.push(ROUTES.messages)}
              >
                ←
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">
                  {thread.peer.name}
                </p>
                <Link
                  href={ROUTES.tenderDetail(thread.tender.id)}
                  className="truncate text-xs font-bold text-amber-800 hover:underline"
                >
                  {thread.tender.title}
                </Link>
              </div>
              {archived ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  <Archive className="size-3" />
                  Արխիվ
                </span>
              ) : (
                <Link
                  href={ROUTES.contract(thread.contractId)}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-900 ring-1 ring-amber-200"
                >
                  <FileText className="size-3.5" />
                  Պայմանագիր
                </Link>
              )}
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto bg-[#f7f4ee]/40 px-4 py-4"
            >
              {messages.map((m) => {
                if (m.kind === "SYSTEM_CONTRACT") {
                  return (
                    <div
                      key={m.id}
                      className="mx-auto max-w-md rounded-2xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-200"
                    >
                      <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-amber-950">
                        {m.body}
                      </p>
                      {m.contractHref ? (
                        <Link
                          href={m.contractHref}
                          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-3 py-2 text-xs font-black text-white"
                        >
                          <FileText className="size-3.5" />
                          Բացել պայմանագիրը
                        </Link>
                      ) : null}
                      <p className="mt-2 text-[10px] font-semibold text-amber-700/70">
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  );
                }

                const fromPeer = m.senderUserId === thread.peer.id;
                const alignEnd = !fromPeer;

                return (
                  <div
                    key={m.id}
                    className={`flex ${alignEnd ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[min(100%,420px)] rounded-2xl px-3.5 py-2.5 ${
                        alignEnd
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-900 ring-1 ring-slate-200"
                      }`}
                    >
                      {!alignEnd && m.sender ? (
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {m.sender.name}
                        </p>
                      ) : null}
                      {m.body.trim() ? (
                        <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">
                          {m.body}
                        </p>
                      ) : null}
                      {m.attachments.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {m.attachments.map((a) =>
                            isImageMime(a.mimeType) ? (
                              <li key={a.id}>
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={a.url}
                                    alt={a.originalFileName}
                                    className="max-h-48 w-full object-cover"
                                  />
                                </a>
                              </li>
                            ) : (
                              <li key={a.id}>
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold underline-offset-2 hover:underline ${
                                    alignEnd
                                      ? "text-amber-100"
                                      : "text-amber-800"
                                  }`}
                                >
                                  <Paperclip className="size-3.5" />
                                  {a.originalFileName}
                                </a>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : null}
                      <p
                        className={`mt-1 text-[10px] font-semibold ${
                          alignEnd ? "text-white/50" : "text-slate-400"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="border-t border-slate-100 px-3 py-3">
              {archived ? (
                <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
                  Զրույցը արխիվացված է · միայն դիտում
                </p>
              ) : (
                <>
                  {files.length > 0 ? (
                    <ul className="mb-2 flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700"
                        >
                          <Paperclip className="size-3" />
                          <span className="max-w-[120px] truncate">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            aria-label="Հեռացնել"
                            onClick={() =>
                              setFiles((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const next = Array.from(e.target.files ?? []);
                        setFiles((prev) => [...prev, ...next].slice(0, 5));
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"
                      aria-label="Կցել ֆայլ"
                    >
                      <Paperclip className="size-4" />
                    </button>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={1}
                      placeholder="Գրեք հաղորդագրություն…"
                      className="max-h-28 min-h-10 flex-1 resize-none rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-amber-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void send()}
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white disabled:opacity-50"
                      aria-label="Ուղարկել"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 text-sm font-semibold text-slate-500">
            Զրույցը չի գտնվել
          </div>
        )}
      </section>
    </div>
  );
}
