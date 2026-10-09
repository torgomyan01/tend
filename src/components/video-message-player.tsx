"use client";

import { ChevronLeft, ChevronRight, Play, Video, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Tone = "outgoing" | "incoming" | "call";

type Props = {
  srcs: string[];
  label?: string;
  tone?: Tone;
};

const toneStyles: Record<
  Tone,
  {
    chip: string;
    iconWrap: string;
    icon: string;
    text: string;
    meta: string;
  }
> = {
  outgoing: {
    chip: "bg-white/[0.1] ring-1 ring-white/15 hover:bg-white/[0.16]",
    iconWrap: "bg-amber-400 text-slate-950",
    icon: "text-slate-950",
    text: "text-white",
    meta: "text-white/55",
  },
  incoming: {
    chip: "bg-gradient-to-r from-slate-50 to-amber-50/50 ring-1 ring-slate-200/90 hover:from-slate-100 hover:to-amber-50",
    iconWrap: "bg-slate-950 text-white",
    icon: "text-white",
    text: "text-slate-900",
    meta: "text-slate-500",
  },
  call: {
    chip: "bg-white/[0.08] ring-1 ring-white/12 hover:bg-white/[0.14]",
    iconWrap: "bg-amber-400 text-slate-950",
    icon: "text-slate-950",
    text: "text-white",
    meta: "text-white/55",
  },
};

export function VideoMessagePlayer({
  srcs,
  label = "Տեսանյութ",
  tone = "incoming",
}: Props) {
  const styles = toneStyles[tone];
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const uniqueSrcs = [...new Set(srcs.filter(Boolean))];
  const currentSrc = uniqueSrcs[index] ?? uniqueSrcs[0];
  const multi = uniqueSrcs.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (!multi) return;
      if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(uniqueSrcs.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, multi, uniqueSrcs.length]);

  useEffect(() => {
    if (!open) return;
    const el = videoRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => {
      /* autoplay may be blocked until user taps play */
    });
  }, [open, currentSrc]);

  if (uniqueSrcs.length === 0) return null;

  function openPlayer() {
    setIndex(0);
    setOpen(true);
  }

  function closePlayer() {
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openPlayer}
        className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99] ${styles.chip}`}
      >
        <span
          className={`relative grid size-11 shrink-0 place-items-center rounded-xl shadow-sm ${styles.iconWrap}`}
        >
          <Video className={`size-5 ${styles.icon}`} />
          <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-white text-slate-950 shadow ring-1 ring-black/5">
            <Play className="size-2.5 fill-current" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-black ${styles.text}`}>
            {label}
          </span>
          <span className={`mt-0.5 block text-[11px] font-semibold ${styles.meta}`}>
            {multi
              ? `${uniqueSrcs.length} հատված · դիտել`
              : "Սեղմեք դիտելու համար"}
          </span>
        </span>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full bg-black/5 ${styles.text}`}
        >
          <Play className="size-3.5 fill-current opacity-80" />
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={closePlayer}
            >
              <div
                className="flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] bg-slate-950 shadow-2xl ring-1 ring-white/10 sm:rounded-[1.75rem]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950">
                    <Video className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      id={titleId}
                      className="truncate text-sm font-black text-white"
                    >
                      {label}
                    </p>
                    <p className="text-[11px] font-semibold text-white/50">
                      {multi
                        ? `Հատված ${index + 1} / ${uniqueSrcs.length}`
                        : "Զանգի տեսագրություն"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePlayer}
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                    aria-label="Փակել"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="relative bg-black">
                  <video
                    key={currentSrc}
                    ref={videoRef}
                    controls
                    playsInline
                    preload="metadata"
                    src={currentSrc}
                    className="mx-auto max-h-[min(70dvh,720px)] w-full bg-black object-contain"
                    onEnded={() => {
                      if (multi && index < uniqueSrcs.length - 1) {
                        setIndex((i) => i + 1);
                      }
                    }}
                  />
                </div>

                {multi ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <button
                      type="button"
                      disabled={index <= 0}
                      onClick={() => setIndex((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:opacity-35"
                    >
                      <ChevronLeft className="size-4" />
                      Նախորդ
                    </button>
                    <div className="flex items-center gap-1.5">
                      {uniqueSrcs.map((_, i) => (
                        <button
                          key={uniqueSrcs[i]}
                          type="button"
                          aria-label={`Հատված ${i + 1}`}
                          onClick={() => setIndex(i)}
                          className={`h-1.5 rounded-full transition ${
                            i === index
                              ? "w-5 bg-amber-400"
                              : "w-1.5 bg-white/25 hover:bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={index >= uniqueSrcs.length - 1}
                      onClick={() =>
                        setIndex((i) =>
                          Math.min(uniqueSrcs.length - 1, i + 1),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:opacity-35"
                    >
                      Հաջորդ
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-center text-[11px] font-semibold text-white/40">
                      Սեղմեք ֆոնին կամ X՝ փակելու համար
                    </p>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
