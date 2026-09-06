"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Timer, Trophy } from "lucide-react";

type Props = {
  endsAtIso: string | null;
  /** Server-computed ms until end; avoids hydration mismatch from `Date.now()` in render */
  initialRemainingMs: number | null;
  /** Երբ կատարողն ընտրված է՝ հետհաշվարկի փոխարեն ցուցադրվում է կարճ կարգավիճակ */
  performerSelected?: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Unit({
  value,
  label,
  tick,
}: {
  value: string;
  label: string;
  tick?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        key={tick ? value : "static"}
        className={[
          "font-mono text-sm font-black tabular-nums leading-none text-slate-900 sm:text-base",
          tick ? "animate-[tender-countdown-tick_0.32s_ease-out]" : "",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-amber-800/65">
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span
      className="pb-2.5 font-mono text-xs font-black text-amber-400"
      aria-hidden
    >
      :
    </span>
  );
}

export function TenderEndsCountdown({
  endsAtIso,
  initialRemainingMs,
  performerSelected = false,
}: Props) {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    initialRemainingMs,
  );

  useEffect(() => {
    if (performerSelected || !endsAtIso) return;
    const endTime = new Date(endsAtIso).getTime();
    if (Number.isNaN(endTime)) return;

    const update = () => {
      const ms = endTime - Date.now();
      setRemainingMs(ms);
      return ms;
    };

    const msAfterSync = update();
    if (msAfterSync <= 0) return;

    const id = window.setInterval(() => {
      const ms = endTime - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [endsAtIso, performerSelected]);

  if (performerSelected) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-200">
        <Trophy className="size-3.5 shrink-0 text-emerald-700" />
        Կատարողը ընտրված է
      </div>
    );
  }

  if (!endsAtIso) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
        <CalendarOff className="size-3.5 shrink-0" />
        Վերջնաժամկետ չկա
      </div>
    );
  }

  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end) || remainingMs === null) {
    return null;
  }

  if (remainingMs <= 0) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-slate-800">
        <Timer className="size-3.5 shrink-0 text-slate-400" />
        Ավարտված է
      </div>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const urgent = remainingMs < 24 * 3600 * 1000;

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm ring-1 backdrop-blur-sm",
        urgent
          ? "bg-rose-50/95 ring-rose-200"
          : "bg-white/90 ring-amber-200/90",
      ].join(" ")}
    >
      <div className="flex items-end gap-1.5">
        {days > 0 ? (
          <>
            <Unit value={String(days)} label="օր" />
            <Sep />
          </>
        ) : null}
        <Unit value={pad(hours)} label="ժամ" />
        <Sep />
        <Unit value={pad(minutes)} label="րոպե" />
        <Sep />
        <Unit value={pad(seconds)} label="վրկ" tick />
      </div>
    </div>
  );
}
