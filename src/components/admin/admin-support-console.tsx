"use client";

import {
  Headphones,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Send,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { formatDateTime } from "@/lib/format";

type ConversationItem = {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  lastMessageAt: string;
  needsReply: boolean;
  lastMessage: {
    id: string;
    sender: string;
    body: string;
    createdAt: string;
  } | null;
};

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

type TargetUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
};

const POLL_MS = 10_000;

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function AdminSupportConsole() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialUserId,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  useEffect(() => {
    lastMessageAtRef.current = messages.at(-1)?.createdAt ?? null;
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support/conversations", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items?: ConversationItem[];
        needsReplyCount?: number;
      };
      setConversations(data.items ?? []);
      setNeedsReplyCount(data.needsReplyCount ?? 0);
    } catch {
      /* ignore */
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadChat = useCallback(async (userId: string) => {
    setChatLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/support/conversations/${encodeURIComponent(userId)}/messages`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError("Չհաջողվեց բեռնել զրույցը։");
        return;
      }
      const data = (await res.json()) as {
        messages?: ChatMessage[];
        user?: TargetUser | null;
      };
      setMessages(data.messages ?? []);
      setTargetUser(data.user ?? null);
      await fetch(
        `/api/admin/support/conversations/${encodeURIComponent(userId)}/read`,
        { method: "PATCH" },
      );
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setChatLoading(false);
    }
  }, []);

  const pollMessages = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const last = lastMessageAtRef.current;
      const url = last
        ? `/api/admin/support/conversations/${encodeURIComponent(selectedUserId)}/messages?after=${encodeURIComponent(last)}`
        : `/api/admin/support/conversations/${encodeURIComponent(selectedUserId)}/messages`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMessage[] };
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
      }
    } catch {
      /* ignore */
    }
  }, [selectedUserId]);

  useEffect(() => {
    void fetchConversations();
    const id = window.setInterval(() => void fetchConversations(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadChat(selectedUserId);
  }, [selectedUserId, loadChat]);

  useEffect(() => {
    if (!selectedUserId) return;
    const id = window.setInterval(() => void pollMessages(), POLL_MS);
    return () => window.clearInterval(id);
  }, [selectedUserId, pollMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, selectedUserId]);

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setMessages([]);
    setTargetUser(null);
    router.replace(`${ROUTES.admin.support}?user=${encodeURIComponent(userId)}`, {
      scroll: false,
    });
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUserId) return;
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
      const res = await fetch(
        `/api/admin/support/conversations/${encodeURIComponent(selectedUserId)}/messages`,
        { method: "POST", body: formData },
      );
      const data = (await res.json()) as { error?: string; message?: ChatMessage };
      if (!res.ok) {
        setError(
          data.error === "INVALID_FILE"
            ? "Ֆայլը թույլատրելի չէ (մինչև 5 MB)։"
            : "Չուղարկվեց։",
        );
        return;
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setText("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void fetchConversations();
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = conversations.find(
    (c) => c.userId === selectedUserId,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-6">
      <aside className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 lg:max-h-[calc(100vh-12rem)]">
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <Headphones className="size-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900">Զրույցներ</p>
              <p className="text-xs font-semibold text-slate-500">
                {needsReplyCount > 0
                  ? `${needsReplyCount} սպասում է պատասխանի`
                  : "Բոլորին պատասխանված է"}
              </p>
            </div>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto p-2">
          {listLoading ? (
            <li className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </li>
          ) : conversations.length === 0 ? (
            <li className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
              Դեռ հաղորդագրություններ չկան
            </li>
          ) : (
            conversations.map((c) => {
              const active = c.userId === selectedUserId;
              const label = c.user.name?.trim() || c.user.email;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectUser(c.userId)}
                    className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-slate-950 text-white shadow-lg"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-black">{label}</span>
                      {c.needsReply ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            active
                              ? "bg-amber-300 text-slate-950"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          Նոր
                        </span>
                      ) : null}
                    </div>
                    {c.lastMessage ? (
                      <p
                        className={`mt-1 line-clamp-2 text-xs font-semibold ${
                          active ? "text-white/70" : "text-slate-500"
                        }`}
                      >
                        {c.lastMessage.sender === "USER" ? "" : "Դուք՝ "}
                        {c.lastMessage.body.trim() || "📎 ֆայլ"}
                      </p>
                    ) : null}
                    <p
                      className={`mt-1 text-[10px] font-bold ${
                        active ? "text-amber-200" : "text-slate-400"
                      }`}
                    >
                      {formatDateTime(c.lastMessageAt)}
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 lg:min-h-[calc(100vh-12rem)]">
        {!selectedUserId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Headphones className="size-10 text-slate-300" />
            <p className="text-sm font-black text-slate-700">
              Ընտրեք օգտատիրոջը ձախից
            </p>
            <p className="max-w-xs text-xs font-semibold text-slate-500">
              Կպատասխանենք հնարավորինս արագ։ Նոր հաղորդագրությունների դեպքում
              Telegram ծանուցում կստանաք։
            </p>
          </div>
        ) : (
          <>
            <header className="border-b border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-950">
                    {targetUser?.name?.trim() ||
                      selectedConversation?.user.name?.trim() ||
                      "Օգտատեր"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {targetUser?.email ?? selectedConversation?.user.email}
                    </span>
                    {(targetUser?.phone ?? selectedConversation?.user.phone) ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {targetUser?.phone ?? selectedConversation?.user.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={ROUTES.userProfile(selectedUserId)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  <User className="size-3.5" />
                  Պրոֆիլ
                </Link>
              </div>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto bg-[#f7f4ee]/40 p-4"
            >
              {chatLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="rounded-2xl bg-white p-4 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                  Զրույցը դեռ սկսված չէ
                </p>
              ) : (
                messages.map((msg) => {
                  const isStaff = msg.sender === "STAFF";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          isStaff
                            ? "bg-slate-950 text-white"
                            : "bg-white text-slate-800 ring-1 ring-slate-200"
                        }`}
                      >
                        {isStaff && msg.staff?.name ? (
                          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-300">
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
                                    className="block overflow-hidden rounded-xl"
                                  >
                                    <Image
                                      src={att.url}
                                      alt={att.originalFileName}
                                      width={280}
                                      height={180}
                                      className="max-h-44 w-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-xs font-black underline ${
                                      isStaff ? "text-amber-200" : "text-amber-800"
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
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2">
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
              className="border-t border-slate-200 p-4"
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
                  placeholder="Պատասխան…"
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
          </>
        )}
      </section>
    </div>
  );
}
