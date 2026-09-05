"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Props = {
  isLoggedIn: boolean;
};

export function ProvidersRegisterCta({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!isLoggedIn) {
    return (
      <Link
        href={ROUTES.register}
        className="inline-flex items-center justify-center gap-3 rounded-full bg-amber-300 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-300/15 transition hover:-translate-y-1 hover:bg-amber-200"
      >
        Գրանցվել որպես մասնագետ
        <ArrowRight className="size-5" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-3 rounded-full bg-amber-300 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-300/15 transition hover:-translate-y-1 hover:bg-amber-200"
      >
        Գրանցվել որպես մասնագետ
        <ArrowRight className="size-5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Փակել"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-5" />
            </button>

            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-6" />
            </div>

            <h2
              id={titleId}
              className="mt-5 text-xl font-black tracking-tight text-slate-950"
            >
              Դուք արդեն գրանցված եք
            </h2>
            <p
              id={descId}
              className="mt-3 text-sm font-semibold leading-7 text-slate-600"
            >
              Ձեզ մնում է մասնակցել մրցույթներին՝ ընտրել համապատասխան
              հայտարարություն և ուղարկել ձեր առաջարկը։
            </p>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link
                href={ROUTES.tenders}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                Դիտել մրցույթները
                <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-50 px-5 py-3.5 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Փակել
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
