"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeaturedHomeTender } from "@/lib/home-featured-tenders";
import { ROUTES } from "@/lib/routes";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function FeaturedCountdown({
  endsAtIso,
  initialRemainingMs,
}: {
  endsAtIso: string | null;
  initialRemainingMs: number | null;
}) {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    initialRemainingMs,
  );

  useEffect(() => {
    if (!endsAtIso) return;
    const endTime = new Date(endsAtIso).getTime();
    if (Number.isNaN(endTime)) return;

    const tick = () => setRemainingMs(endTime - Date.now());
    tick();
    const ms = endTime - Date.now();
    if (ms <= 0) return;

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAtIso]);

  if (!endsAtIso) {
    return (
      <span className="text-sm font-black text-slate-300">Չի սահմանված</span>
    );
  }

  if (remainingMs === null) {
    return null;
  }

  if (remainingMs <= 0) {
    return (
      <span className="text-sm font-black text-slate-400">Ավարտված</span>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return (
      <span className="font-black tabular-nums text-amber-200">
        {days} օր · {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  return (
    <span className="font-black tabular-nums text-amber-200">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

type Props = {
  tenders: FeaturedHomeTender[];
};

export function FeaturedTenderSlider({ tenders }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = tenders.length;
  const safeIndex = count > 0 ? Math.min(activeIndex, count - 1) : 0;
  const activeTender = count > 0 ? tenders[safeIndex] : null;

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(count - 1);
    }
  }, [activeIndex, count]);

  useEffect(() => {
    if (count <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        currentIndex === count - 1 ? 0 : currentIndex + 1,
      );
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [count]);

  if (count === 0 || !activeTender) {
    return (
      <div className="rounded-4xl border border-white/70 bg-white/80 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur sm:p-4">
        <div className="overflow-hidden rounded-4xl bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold text-amber-200">
            Վերջին մրցույթներ
          </p>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">
            Այս պահին ակտիվ մրցույթներ չկան
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-400">
            Նոր մրցույթները կերևան այստեղ հենց հրապարակվելուն պես։
          </p>
          <Link
            href={ROUTES.tenders}
            className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
          >
            Բոլոր մրցույթները
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-white/70 bg-white/80 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur sm:p-4">
      <div className="overflow-hidden rounded-4xl bg-slate-950 p-4 text-white sm:p-5">
        <Link
          href={ROUTES.tenderDetail(activeTender.id)}
          key={activeTender.id}
          className="group block animate-[tender-slide-in_600ms_ease-out]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Վերջին մրցույթներից
              </p>
              <h2 className="mt-1 text-xl font-black transition group-hover:text-amber-100 sm:text-2xl">
                {activeTender.title}
              </h2>
            </div>
            <div className="w-fit shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-right">
              <p className="text-xs text-slate-300">մնում է</p>
              <p className="mt-0.5">
                <FeaturedCountdown
                  endsAtIso={activeTender.endsAtIso}
                  initialRemainingMs={activeTender.initialRemainingMs}
                />
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            {activeTender.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-3xl bg-white p-4 text-slate-950 sm:mt-6 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Փակ առաջարկներ
                </p>
                <p className="mt-1 text-2xl font-black sm:text-3xl">
                  {activeTender.bidCount} առաջարկ
                </p>
              </div>
              {activeTender.bidderBadges.length > 0 ? (
                <div className="flex -space-x-3">
                  {activeTender.bidderBadges.map((item, idx) => (
                    <span
                      key={`${activeTender.id}-b-${idx}`}
                      className="grid size-10 place-items-center rounded-full border-2 border-white bg-amber-100 text-sm font-black text-amber-900 sm:size-11"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-semibold text-slate-400">—</span>
              )}
            </div>
            <div className="mt-5 space-y-3">
              {activeTender.notes.map((item, i) => (
                <div
                  key={`${activeTender.id}-n-${i}`}
                  className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 sm:items-center"
                >
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-800/80">
              Սեղմեք՝ մանրամասների
            </p>
          </div>
        </Link>

        <div className="mt-5 flex items-center justify-center gap-2">
          {tenders.map((tender, index) => (
            <button
              key={tender.id}
              type="button"
              aria-label={`${index + 1}-րդ մրցույթը`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === safeIndex
                  ? "w-8 bg-amber-300"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
