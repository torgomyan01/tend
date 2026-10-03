"use client";

import {
  Archive,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Phone,
  Send,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CallRoom, type CallDto } from "@/components/call-room";
import { VoiceMessagePlayer } from "@/components/voice-message-player";
import { ROUTES } from "@/lib/routes";
import { toastError } from "@/lib/toast";

const VOICE_BODY_LABEL = "Ձայնային հաղորդագրություն";

type Attachment = {
  id: string;
  url: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Message = {
  id: string;
  kind: "TEXT" | "SYSTEM_CONTRACT" | "SYSTEM_ESCROW" | "SYSTEM_CALL";
  body: string;
  contractId: string | null;
  contractHref: string | null;
  createdAt: string;
  senderUserId: string | null;
  senderIsStaff?: boolean;
  sender: { id: string; name: string; image: string | null } | null;
  attachments: Attachment[];
};

function isVideoMime(mime: string) {
  return mime.startsWith("video/");
}

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
  isStaffView?: boolean;
};

type ThreadMeta = {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: string | null;
  contractId: string;
  tender: { id: string; title: string };
  peer: { id: string; name: string; image: string | null };
  client?: { id: string; name: string; image: string | null };
  provider?: { id: string; name: string; image: string | null };
  role: "client" | "provider" | "admin";
};

const POLL_MS = 9_000;

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function isAudioMime(mime: string) {
  return mime.startsWith("audio/");
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatRecordingDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  if (!one) return "Կցված ֆայլ";
  return one.length > 80 ? `${one.slice(0, 80)}…` : one;
}

export function MessagesInbox() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const activeId = typeof params?.id === "string" ? params.id : null;

  const [list, setList] = useState<ConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [thread, setThread] = useState<ThreadMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeCall, setActiveCall] = useState<CallDto | null>(null);
  const [startingCall, setStartingCall] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(activeId);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartedAtRef = useRef<number>(0);

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

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const clearRecordTimer = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    recordChunksRef.current = [];
    clearRecordTimer();
    setRecording(false);
    setRecordingSeconds(0);
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stopMediaTracks();
  }, [clearRecordTimer, stopMediaTracks]);

  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  useEffect(() => {
    if (!activeId) return;
    cancelRecording();
  }, [activeId, cancelRecording]);

  async function send(overrideFiles?: File[], overrideBody?: string) {
    if (!activeId || !thread) return;
    const staffCanWrite = thread.role === "admin";
    if (thread.status === "ARCHIVED" && !staffCanWrite) return;
    const attach = overrideFiles ?? files;
    const body = (overrideBody ?? text).trim();
    if (!body && attach.length === 0) return;

    setSending(true);
    try {
      const form = new FormData();
      form.set("body", body);
      for (const f of attach) form.append("files", f);
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
      if (!overrideFiles) {
        setText("");
        setFiles([]);
      }
      void loadList();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (!activeId || !thread || sending || recording) return;
    const staffCanWrite = thread.role === "admin";
    if (thread.status === "ARCHIVED" && !staffCanWrite) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toastError("Ձայնագրում անհասանելի է", "Զննարկիչը չի աջակցում միկրոֆոն։");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];
      recordStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };

      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - recordStartedAtRef.current) / 1000),
        );
      }, 250);

      recorder.start(250);
    } catch {
      stopMediaTracks();
      setRecording(false);
      toastError(
        "Միկրոֆոնի թույլտվություն",
        "Թույլատրեք միկրոֆոնը՝ ձայնային ուղարկելու համար։",
      );
    }
  }

  function finishRecording(sendAfter: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cancelRecording();
      return;
    }

    clearRecordTimer();
    setRecording(false);

    recorder.onstop = () => {
      const chunks = recordChunksRef.current;
      recordChunksRef.current = [];
      mediaRecorderRef.current = null;
      stopMediaTracks();
      const elapsed = Math.floor(
        (Date.now() - recordStartedAtRef.current) / 1000,
      );
      setRecordingSeconds(0);

      if (!sendAfter || chunks.length === 0 || elapsed < 1) {
        if (sendAfter && elapsed < 1) {
          toastError("Շատ կարճ է", "Ձայնագրեք առնվազն 1 վայրկյան։");
        }
        return;
      }

      const blobType =
        recorder.mimeType || chunks[0]?.type || "audio/webm";
      const ext = blobType.includes("mp4")
        ? "m4a"
        : blobType.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File(
        [new Blob(chunks, { type: blobType })],
        `voice-${Date.now()}.${ext}`,
        { type: blobType.split(";")[0] || "audio/webm" },
      );
      void send([file], VOICE_BODY_LABEL);
    };

    recorder.stop();
  }


  const archived = thread?.status === "ARCHIVED";

  async function startCall(mediaType: "AUDIO" | "VIDEO") {
    if (!activeId || !thread || startingCall || activeCall) return;
    if (thread.role === "admin" || archived) return;
    setStartingCall(true);
    try {
      const res = await fetch(`/api/messages/${activeId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        call?: CallDto;
      } | null;
      if (!res.ok || !data?.call) {
        const map: Record<string, string> = {
          CALL_IN_PROGRESS: "Արդեն կա ակտիվ զանգ։",
          ARCHIVED: "Զրույցը արխիվացված է։",
        };
        toastError(
          "Չհաջողվեց զանգել",
          map[data?.error ?? ""] ?? "Փորձեք նորից։",
        );
        return;
      }
      setActiveCall(data.call);
      void loadThread(activeId, false);
      void loadList();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setStartingCall(false);
    }
  }

  useEffect(() => {
    if (!currentUserId) return;
    let stopped = false;

    async function pollIncoming() {
      if (stopped) return;
      try {
        const res = await fetch("/api/calls/incoming");
        if (!res.ok) return;
        const data = (await res.json()) as {
          incoming?: Array<CallDto & { tenderTitle?: string }>;
          active?: CallDto | null;
        };
        if (activeCall) {
          if (data.active && data.active.id === activeCall.id) {
            setActiveCall((prev) =>
              prev ? { ...prev, ...data.active! } : data.active!,
            );
          }
          return;
        }
        const first = data.incoming?.[0];
        if (first) {
          setActiveCall(first);
          if (first.conversationId !== activeId) {
            router.push(ROUTES.messageThread(first.conversationId));
          }
        } else if (data.active) {
          setActiveCall(data.active);
        }
      } catch {
        /* ignore */
      }
    }

    void pollIncoming();
    const id = window.setInterval(() => void pollIncoming(), 2500);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [currentUserId, activeCall, activeId, router]);

  return (
    <>
    {activeCall && currentUserId ? (
      <CallRoom
        call={activeCall}
        currentUserId={currentUserId}
        peerName={thread?.peer.name ?? "Օգտատեր"}
        onClose={({ refreshChat } = {}) => {
          setActiveCall(null);
          if (refreshChat && activeId) {
            void loadThread(activeId, false);
            void loadList();
          }
        }}
      />
    ) : null}
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
                        {c.isStaffView ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-rose-600">
                            Վեճ · մոդերացիա
                          </span>
                        ) : null}
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
                  {thread.role === "admin" && thread.client && thread.provider
                    ? `${thread.client.name} · ${thread.provider.name}`
                    : thread.peer.name}
                </p>
                <Link
                  href={ROUTES.tenderDetail(thread.tender.id)}
                  className="truncate text-xs font-bold text-amber-800 hover:underline"
                >
                  {thread.tender.title}
                </Link>
                {thread.role === "admin" ? (
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">
                    Ադմին մոդերացիա · վեճի զրույց
                  </p>
                ) : null}
              </div>
              {thread.role === "admin" ? (
                <Link
                  href={ROUTES.admin.disputes}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-rose-900 ring-1 ring-rose-200"
                >
                  Վեճեր
                </Link>
              ) : null}
              {!archived && thread.role !== "admin" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={startingCall || Boolean(activeCall)}
                    onClick={() => void startCall("AUDIO")}
                    className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                    aria-label="Ձայնային զանգ"
                    title="Ձայնային զանգ"
                  >
                    <Phone className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={startingCall || Boolean(activeCall)}
                    onClick={() => void startCall("VIDEO")}
                    className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-800 transition hover:bg-amber-50 hover:text-amber-900 disabled:opacity-50"
                    aria-label="Տեսազանգ"
                    title="Տեսազանգ"
                  >
                    <Video className="size-4" />
                  </button>
                </div>
              ) : null}
              {archived && thread.role !== "admin" ? (
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
                if (m.kind === "SYSTEM_CALL") {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[min(100%,420px)] rounded-2xl bg-slate-900 px-3.5 py-2.5 text-center text-white shadow-sm ring-1 ring-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                          Զանգ
                        </p>
                        <p className="mt-1 text-sm font-bold">{m.body}</p>
                        {m.attachments.length > 0 ? (
                          <ul className="mt-2 space-y-2 text-left">
                            {m.attachments.map((a) =>
                              isVideoMime(a.mimeType) ? (
                                <li key={a.id}>
                                  <video
                                    controls
                                    preload="metadata"
                                    src={a.url}
                                    className="max-h-64 w-full rounded-xl bg-black"
                                  />
                                </li>
                              ) : isAudioMime(a.mimeType) ? (
                                <li key={a.id}>
                                  <VoiceMessagePlayer
                                    src={a.url}
                                    tone="outgoing"
                                  />
                                </li>
                              ) : (
                                <li key={a.id}>
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-amber-200 underline"
                                  >
                                    {a.originalFileName}
                                  </a>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-[10px] font-semibold text-white/45">
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (m.kind === "SYSTEM_CONTRACT" || m.kind === "SYSTEM_ESCROW") {
                  const escrow = m.kind === "SYSTEM_ESCROW";
                  return (
                    <div
                      key={m.id}
                      className={`mx-auto max-w-md rounded-2xl px-4 py-3 text-center ring-1 ${
                        escrow
                          ? "bg-emerald-50 ring-emerald-200"
                          : "bg-amber-50 ring-amber-200"
                      }`}
                    >
                      <p
                        className={`whitespace-pre-wrap text-xs font-semibold leading-relaxed ${
                          escrow ? "text-emerald-950" : "text-amber-950"
                        }`}
                      >
                        {m.body}
                      </p>
                      {m.contractHref ? (
                        <Link
                          href={m.contractHref}
                          className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-white ${
                            escrow ? "bg-emerald-800" : "bg-amber-800"
                          }`}
                        >
                          <FileText className="size-3.5" />
                          {escrow ? "Բացել մանրամասները" : "Բացել պայմանագիրը"}
                        </Link>
                      ) : null}
                      <p
                        className={`mt-2 text-[10px] font-semibold ${
                          escrow
                            ? "text-emerald-700/70"
                            : "text-amber-700/70"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  );
                }

                const isStaffMsg = Boolean(m.senderIsStaff);
                const fromPeer =
                  !isStaffMsg && m.senderUserId === thread.peer.id;
                const alignEnd = !isStaffMsg && !fromPeer;

                if (isStaffMsg) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[min(100%,480px)] rounded-2xl bg-indigo-50 px-3.5 py-2.5 ring-1 ring-indigo-200">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-indigo-700">
                          {m.sender?.name ?? "Tend.am ադմին"}
                        </p>
                        {m.body.trim() ? (
                          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-indigo-950">
                            {m.body}
                          </p>
                        ) : null}
                        {m.attachments.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {m.attachments.map((a) =>
                              isAudioMime(a.mimeType) ? (
                                <li key={a.id}>
                                  <VoiceMessagePlayer
                                    src={a.url}
                                    tone="staff"
                                  />
                                </li>
                              ) : (
                                <li key={a.id}>
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 underline-offset-2 hover:underline"
                                  >
                                    <Paperclip className="size-3.5" />
                                    {a.originalFileName}
                                  </a>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-[10px] font-semibold text-indigo-700/70">
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                }

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
                      {(() => {
                        const hasAudio = m.attachments.some((a) =>
                          isAudioMime(a.mimeType),
                        );
                        const body = m.body.trim();
                        const hideVoiceLabel =
                          hasAudio && body === VOICE_BODY_LABEL;
                        if (!body || hideVoiceLabel) return null;
                        return (
                          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">
                            {m.body}
                          </p>
                        );
                      })()}
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
                            ) : isAudioMime(a.mimeType) ? (
                              <li key={a.id}>
                                <VoiceMessagePlayer
                                  src={a.url}
                                  tone={alignEnd ? "outgoing" : "incoming"}
                                />
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
              {archived && thread.role !== "admin" ? (
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
                          {isAudioMime(f.type) ? (
                            <Mic className="size-3" />
                          ) : (
                            <Paperclip className="size-3" />
                          )}
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
                  {recording ? (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 ring-1 ring-rose-100">
                      <span className="relative flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
                      </span>
                      <p className="flex-1 text-sm font-bold text-rose-700">
                        Ձայնագրում · {formatRecordingDuration(recordingSeconds)}
                      </p>
                      <button
                        type="button"
                        onClick={() => cancelRecording()}
                        className="grid size-9 place-items-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200"
                        aria-label="Չեղարկել ձայնագրումը"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => finishRecording(true)}
                        className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white disabled:opacity-50"
                        aria-label="Ուղարկել ձայնայինը"
                      >
                        {sending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.txt,audio/*,.webm,.ogg,.mp3,.m4a,.wav"
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
                        disabled={sending}
                      >
                        <Paperclip className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void startRecording()}
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 disabled:opacity-50"
                        aria-label="Ձայնագրել"
                        disabled={sending}
                      >
                        <Mic className="size-4" />
                      </button>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={1}
                        placeholder={
                          thread.role === "admin"
                            ? "Ադմինի հաղորդագրություն կողմերին…"
                            : "Գրեք հաղորդագրություն…"
                        }
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
                  )}
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
    </>
  );
}
