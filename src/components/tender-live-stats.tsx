"use client";

import { Eye, Flame, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  tenderId: string;
  /** SSR snapshot from Prisma `_count.bids` */
  initialBidCount: number;
  isActive: boolean;
  endsAtIso: string | null;
};

type Heat = "cold" | "warm" | "hot" | "fire";

function computeHeat(bidCount: number, msLeft: number | null): Heat {
  const closing = msLeft !== null && msLeft > 0 && msLeft < 24 * 3600 * 1000;
  if (bidCount >= 8 || (bidCount >= 4 && closing)) return "fire";
  if (bidCount >= 4 || (bidCount >= 2 && closing)) return "hot";
  if (bidCount >= 1) return "warm";
  return "cold";
}

const HEAT_LABEL: Record<Heat, string> = {
  cold: "Թարմ հրապարակում",
  warm: "Աճող հետաքրքրություն",
  hot: "Բարձր մրցակցություն",
  fire: "Շատ բարձր մրցակցություն",
};

const HEAT_BARS: Record<Heat, number> = {
  cold: 1,
  warm: 2,
  hot: 3,
  fire: 4,
};

const HEAT_COLOR: Record<Heat, string> = {
  cold: "text-slate-500",
  warm: "text-amber-700",
  hot: "text-orange-600",
  fire: "text-rose-600",
};

export function TenderLiveStats({
  tenderId,
  initialBidCount,
  isActive,
  endsAtIso,
}: Props) {
  const [viewers, setViewers] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [bidCount, setBidCount] = useState(() => initialBidCount);

  useEffect(() => {
    setBidCount(initialBidCount);
  }, [initialBidCount]);

  useEffect(() => {
    if (!tenderId) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/tenders/${tenderId}/bid-count`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (
          typeof data.count === "number" &&
          !Number.isNaN(data.count) &&
          !cancelled
        ) {
          setBidCount(data.count);
        }
      } catch {
        /* network */
      }
    };

    void fetchCount();
    if (!isActive) return () => {
      cancelled = true;
    };

    const intervalMs = 18_000;
    const id = window.setInterval(() => void fetchCount(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tenderId, isActive]);

  useEffect(() => {
    if (endsAtIso) {
      const endMs = new Date(endsAtIso).getTime();
      if (!Number.isNaN(endMs)) {
        const tick = () => setMsLeft(endMs - Date.now());
        tick();
        const id = window.setInterval(tick, 30_000);
        return () => window.clearInterval(id);
      }
    }
    setMsLeft(null);
  }, [endsAtIso]);

  useEffect(() => {
    if (!isActive) {
      setViewers(null);
      return;
    }
    const base = 3 + Math.floor(Math.random() * Math.max(3, bidCount + 4));
    setViewers(base);

    const id = window.setInterval(
      () => {
        setViewers((current) => {
          if (current === null) return current;
          const drift = Math.random();
          let next = current;
          if (drift < 0.45) next = current - 1;
          else if (drift < 0.9) next = current + 1;
          else next = current + (Math.random() < 0.5 ? -2 : 2);
          return Math.max(2, Math.min(18, next));
        });
      },
      4500 + Math.floor(Math.random() * 3500),
    );
    return () => window.clearInterval(id);
  }, [isActive, bidCount]);

  const heat = computeHeat(bidCount, msLeft);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-amber-200/70 bg-linear-to-r from-amber-50 via-white to-amber-50 px-4 py-3 ring-1 ring-amber-100/60">
      {isActive ? (
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-green-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          Իրական ժամանակում 
        </span>
      ) : null}

      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700">
        <Eye className="size-4 text-slate-500" />
        {viewers !== null ? (
          <>
            <span className="tabular-nums">{viewers}</span> հոգի դիտում են հենց
            հիմա
          </>
        ) : (
          <span className="text-slate-400">Դիտումներ թարմացվում են…</span>
        )}
      </span>

      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700">
        <Users className="size-4 text-slate-500" />
        <span className="tabular-nums">{bidCount}</span>{" "}
        {bidCount === 1 ? "առաջարկ է ստացված" : "առաջարկներ են ստացված"}
      </span>

      <span
        className={`inline-flex items-center gap-1.5 text-xs font-black ${HEAT_COLOR[heat]}`}
      >
        {heat === "fire" ? (
          <Flame className="size-4" />
        ) : (
          <TrendingUp className="size-4" />
        )}
        <span>{HEAT_LABEL[heat]}</span>
        <span className="ml-1 inline-flex items-end gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`block w-1 rounded-sm ${
                i < HEAT_BARS[heat]
                  ? heat === "fire"
                    ? "bg-rose-500"
                    : heat === "hot"
                      ? "bg-orange-500"
                      : heat === "warm"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                  : "bg-slate-200"
              }`}
              style={{ height: `${(i + 1) * 4}px` }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}
