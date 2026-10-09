"use client";

import {
  Archive,
  ChevronLeft,
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
import { VideoMessagePlayer } from "@/components/video-message-player";
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

function formatListTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString("hy-AM", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("hy-AM", {
      day: "2-digit",
      month: "short",
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
  /** Full thread open / switch — always jump to latest message. */
  const forceScrollRef = useRef(true);
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
          forceScrollRef.current = true;
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
    forceScrollRef.current = true;
    void loadThread(activeId, false).finally(() => setThreadLoading(false));
  }, [activeId, loadThread]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const force = forceScrollRef.current;
    if (force) {
      forceScrollRef.current = false;
      // Layout may settle after images/voice players mount.
      scrollToBottom();
      requestAnimationFrame(() => {
        scrollToBottom();
        window.setTimeout(scrollToBottom, 50);
        window.setTimeout(scrollToBottom, 200);
      });
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Polling: only stick to bottom if the user is already near it.
    if (distanceFromBottom < 140) {
      scrollToBottom();
    }
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

      let res: Response | null = null;
      let data: { error?: string; message?: Message } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          res = await fetch(`/api/messages/${activeId}`, {
            method: "POST",
            body: form,
          });
          data = (await res.json().catch(() => null)) as {
            error?: string;
            message?: Message;
          } | null;
          if (res.ok) break;
          // Retry once on transient server/network style failures.
          if (res.status >= 500 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          break;
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          throw new Error("network");
        }
      }

      if (!res || !res.ok) {
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
        forceScrollRef.current = true;
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
      const cleanType = blobType.split(";")[0] || "audio/webm";
      const ext = cleanType.includes("mp4")
        ? "m4a"
        : cleanType.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File(
        [new Blob(chunks, { type: cleanType })],
        `voice-${Date.now()}.${ext}`,
        { type: cleanType },
      );
      void send([file], VOICE_BODY_LABEL);
    };

    try {
      if (typeof recorder.requestData === "function") {
        recorder.requestData();
      }
      recorder.stop();
    } catch {
      cancelRecording();
      toastError("Ձայնագրում", "Չհաջողվեց ավարտել ձայնագրությունը։");
    }
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
          } else if (!data.active && activeCall.status === "ACTIVE") {
            // ACTIVE call vanished (peer hangup) while signal poll missed it.
            // Do not clear RINGING — caller waits before accept.
            setActiveCall(null);
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
            const id = activeId;
            const refresh = () => {
              void loadThread(id, false);
              void loadList();
            };
            refresh();
            // Recording finalize can land a few seconds after hangup.
            window.setTimeout(refresh, 2000);
            window.setTimeout(refresh, 6000);
          }
        }}
      />
    ) : null}
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 overflow-hidden bg-white md:h-[min(78vh,820px)] md:rounded-[1.75rem] md:shadow-sm md:ring-1 md:ring-slate-200/80">
      <aside
        className={`flex h-full min-h-0 w-full flex-col border-r border-slate-200/80 md:w-[340px] md:shrink-0 ${
          activeId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-100/90 bg-gradient-to-b from-[#faf7f1] to-white px-4 py-4 md:from-white">
          <h1 className="text-xl font-black tracking-tight text-slate-950 md:text-lg">
            Հաղորդագրություններ
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Պատվիրատու · կատարող զրույցներ
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                <Send className="size-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-800">
                Դեռ զրույցներ չկան
              </p>
              <p className="mt-1 max-w-xs text-xs font-semibold leading-relaxed text-slate-500">
                Զրույցը բացվում է պայմանագրի առաջարկից՝ պատվիրատուի և կատարողի միջև։
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100/80">
              {list.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.messageThread(c.id))}
                      className={`flex w-full gap-3 px-4 py-3.5 text-left transition active:bg-slate-50 ${
                        active
                          ? "bg-amber-50/90"
                          : "hover:bg-slate-50/80"
                      } ${c.status === "ARCHIVED" ? "opacity-70" : ""}`}
                    >
                      <div className="relative mt-0.5 size-12 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white shadow-sm md:size-10">
                        {c.peer.image ? (
                          <Image
                            src={c.peer.image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="grid size-full place-items-center bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-black text-white">
                            {c.peer.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {c.unreadCount > 0 ? (
                          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-white md:hidden" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[15px] font-black text-slate-950 md:text-sm">
                            {c.peer.name}
                          </p>
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-400">
                            {formatListTime(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-amber-900/70">
                          {c.tender.title.length > 25
                            ? `${c.tender.title.slice(0, 25)}...`
                            : c.tender.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p
                            className={`min-w-0 flex-1 truncate text-[12px] font-semibold ${
                              c.unreadCount > 0
                                ? "text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            {c.lastMessage
                              ? previewText(c.lastMessage.body)
                              : "—"}
                          </p>
                          {c.unreadCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-white">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </div>
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
        className={`h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          activeId ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#faf7f1_0%,#f3efe6_100%)] px-6 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
              <Send className="size-5" />
            </div>
            <p className="text-sm font-black text-slate-800">Ընտրեք զրույց</p>
            <p className="max-w-sm text-xs font-semibold leading-relaxed text-slate-500">
              Ակտիվ զրույցները վերևում են, արխիվացվածները՝ ներքևում։
            </p>
          </div>
        ) : threadLoading && !thread ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : thread ? (
          <>
            <header className="flex shrink-0 items-center gap-2 border-b border-slate-100/90 bg-white/95 px-2 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:gap-3 md:px-4 md:py-3">
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-full text-slate-700 transition active:bg-slate-100 md:hidden"
                onClick={() => router.push(ROUTES.messages)}
                aria-label="Հետ"
              >
                <ChevronLeft className="size-6" strokeWidth={2.25} />
              </button>
              <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white shadow-sm md:size-10">
                {thread.peer.image ? (
                  <Image
                    src={thread.peer.image}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="grid size-full place-items-center bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-black text-white">
                    {thread.peer.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-black tracking-tight text-slate-950 md:text-sm">
                  {thread.role === "admin" && thread.client && thread.provider
                    ? `${thread.client.name} · ${thread.provider.name}`
                    : thread.peer.name}
                </p>
                <Link
                  href={ROUTES.tenderDetail(thread.tender.id)}
                  className="block truncate text-[11px] font-bold text-amber-800/90 hover:underline md:text-xs"
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={startingCall || Boolean(activeCall)}
                    onClick={() => void startCall("AUDIO")}
                    className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-800 transition active:scale-95 hover:bg-emerald-100 disabled:opacity-50 md:size-9 md:rounded-xl"
                    aria-label="Ձայնային զանգ"
                    title="Ձայնային զանգ"
                  >
                    <Phone className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={startingCall || Boolean(activeCall)}
                    onClick={() => void startCall("VIDEO")}
                    className="grid size-10 place-items-center rounded-full bg-amber-50 text-amber-900 transition active:scale-95 hover:bg-amber-100 disabled:opacity-50 md:size-9 md:rounded-xl"
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
                <>
                  <Link
                    href={ROUTES.contract(thread.contractId)}
                    className="grid size-10 place-items-center rounded-full bg-amber-50 text-amber-900 sm:hidden"
                    aria-label="Պայմանագիր"
                    title="Պայմանագիր"
                  >
                    <FileText className="size-4" />
                  </Link>
                  <Link
                    href={ROUTES.contract(thread.contractId)}
                    className="hidden items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-900 ring-1 ring-amber-200 sm:inline-flex"
                  >
                    <FileText className="size-3.5" />
                    Պայմանագիր
                  </Link>
                </>
              )}
            </header>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#faf7f1_0%,#f3efe6_100%)] px-3 py-3 md:space-y-3 md:px-4 md:py-4"
            >
              {messages.map((m) => {
                if (m.kind === "SYSTEM_CALL") {
                  const uniqueAttachments = [
                    ...new Map(
                      m.attachments.map((a) => [a.url, a] as const),
                    ).values(),
                  ];
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[min(100%,420px)] rounded-2xl bg-slate-900 px-3.5 py-2.5 text-center text-white shadow-sm ring-1 ring-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                          Զանգ
                        </p>
                        <p className="mt-1 text-sm font-bold">{m.body}</p>
                        {uniqueAttachments.length > 0 ? (
                          <div className="mt-2 space-y-2 text-left">
                            {(() => {
                              const videos = uniqueAttachments.filter((a) =>
                                isVideoMime(a.mimeType),
                              );
                              const rest = uniqueAttachments.filter(
                                (a) => !isVideoMime(a.mimeType),
                              );
                              return (
                                <>
                                  {videos.length > 0 ? (
                                    <VideoMessagePlayer
                                      srcs={videos.map((a) => a.url)}
                                      label="Զանգի տեսագրություն"
                                      tone="call"
                                    />
                                  ) : null}
                                  {rest.map((a) =>
                                    isAudioMime(a.mimeType) ? (
                                      <VoiceMessagePlayer
                                        key={a.id}
                                        src={a.url}
                                        tone="outgoing"
                                      />
                                    ) : (
                                      <a
                                        key={a.id}
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-xs font-bold text-amber-200 underline"
                                      >
                                        {a.originalFileName}
                                      </a>
                                    ),
                                  )}
                                </>
                              );
                            })()}
                          </div>
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
                      className={`max-w-[min(92%,420px)] px-3.5 py-2.5 shadow-sm ${
                        alignEnd
                          ? "rounded-[1.25rem] rounded-br-md bg-slate-950 text-white"
                          : "rounded-[1.25rem] rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200/80"
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
                        <div className="mt-2 space-y-2">
                          {(() => {
                            const videos = m.attachments.filter((a) =>
                              isVideoMime(a.mimeType),
                            );
                            const rest = m.attachments.filter(
                              (a) => !isVideoMime(a.mimeType),
                            );
                            return (
                              <>
                                {videos.length > 0 ? (
                                  <VideoMessagePlayer
                                    srcs={videos.map((a) => a.url)}
                                    label="Տեսանյութ"
                                    tone={
                                      alignEnd ? "outgoing" : "incoming"
                                    }
                                  />
                                ) : null}
                                {rest.map((a) =>
                                  isImageMime(a.mimeType) ? (
                                    <a
                                      key={a.id}
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
                                  ) : isAudioMime(a.mimeType) ? (
                                    <VoiceMessagePlayer
                                      key={a.id}
                                      src={a.url}
                                      tone={
                                        alignEnd ? "outgoing" : "incoming"
                                      }
                                    />
                                  ) : (
                                    <a
                                      key={a.id}
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
                                  ),
                                )}
                              </>
                            );
                          })()}
                        </div>
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

            <footer className="shrink-0 border-t border-slate-100/90 bg-white/95 px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 md:px-3 md:py-3">
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
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-100">
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
                        className="grid size-10 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200"
                        aria-label="Չեղարկել ձայնագրումը"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => finishRecording(true)}
                        className="grid size-10 place-items-center rounded-full bg-slate-950 text-white disabled:opacity-50"
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
                    <div className="flex items-end gap-1.5 md:gap-2">
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
                        className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 transition active:bg-slate-100 disabled:opacity-50 md:size-10 md:rounded-xl md:bg-slate-100 md:text-slate-700"
                        aria-label="Կցել ֆայլ"
                        disabled={sending}
                      >
                        <Paperclip className="size-5 md:size-4" />
                      </button>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={1}
                        placeholder={
                          thread.role === "admin"
                            ? "Ադմինի հաղորդագրություն կողմերին…"
                            : "Հաղորդագրություն…"
                        }
                        className="max-h-28 min-h-11 flex-1 resize-none rounded-[1.35rem] bg-slate-100/90 px-4 py-2.5 text-[15px] font-semibold text-slate-900 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-amber-300/80 md:min-h-10 md:rounded-xl md:bg-slate-50 md:text-sm md:ring-slate-200"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                      />
                      {text.trim() || files.length > 0 ? (
                        <button
                          type="button"
                          disabled={sending}
                          onClick={() => void send()}
                          className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm transition active:scale-95 disabled:opacity-50 md:size-10 md:rounded-xl"
                          aria-label="Ուղարկել"
                        >
                          {sending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void startRecording()}
                          className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-900 ring-1 ring-amber-100 transition active:scale-95 disabled:opacity-50 md:size-10 md:rounded-xl md:bg-slate-100 md:text-slate-700 md:ring-0"
                          aria-label="Ձայնագրել"
                          disabled={sending}
                        >
                          <Mic className="size-5 md:size-4" />
                        </button>
                      )}
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
