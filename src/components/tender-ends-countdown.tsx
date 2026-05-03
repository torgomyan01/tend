"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

type Props = {
  endsAtIso: string | null;
  /** Server-computed ms until end; avoids hydration mismatch from `Date.now()` in render */
  initialRemainingMs: number | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function TenderEndsCountdown({
  endsAtIso,
  initialRemainingMs,
}: Props) {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    initialRemainingMs,
  );

  useEffect(() => {
    if (!endsAtIso) return;
    const endTime = new Date(endsAtIso).getTime();
    if (Number.isNaN(endTime)) return;

    const update = () => {
      const ms = endTime - Date.now();
      setRemainingMs(ms);
      return ms;
    };

    // Մեկ անգամ սինխ՝ SPA navigation / ժամացույցի շեղում；ավարտված դեպքում interval չի բացվում
    const msAfterSync = update();
    if (msAfterSync <= 0) return;

    const id = window.setInterval(() => {
      const ms = endTime - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [endsAtIso]);

  if (!endsAtIso) {
    return (
      <div className="rounded-2xl bg-slate-100 px-4 py-3 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Վերջնաժամկետ
        </p>
        <p className="mt-1 text-sm font-bold text-slate-600">Չի նշված</p>
      </div>
    );
  }

  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end)) {
    return null;
  }

  if (remainingMs === null) {
    return null;
  }

  if (remainingMs <= 0) {
    return (
      <div className="rounded-2xl bg-slate-800 px-4 py-3 text-slate-100 ring-1 ring-slate-700">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          <Timer className="size-3.5 shrink-0" />
          Մրցույթը ավարտված է
        </p>
      </div>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return (
    <div className="rounded-2xl bg-amber-950 px-4 py-4 text-amber-50 ring-1 ring-amber-800/80">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/90">
        <Timer className="size-3.5 shrink-0" />
        Մնացել է մինչև վերջնաժամկետ
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-lg font-black tabular-nums sm:text-xl">
        {days > 0 ? (
          <span>
            <span className="text-2xl sm:text-3xl">{days}</span>
            <span className="ml-1 text-xs font-bold uppercase text-amber-200/90">օր</span>
          </span>
        ) : null}
        <span>
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-amber-200/80">
        {days > 0 ? "Ժամեր, րոպեներ, վայրկյաններ" : "Ժամ : րոպե : վայրկյան"}
      </p>
    </div>
  );
}
