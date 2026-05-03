"use client";

import { Flag, Loader2, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type TenderComplaintReasonId,
  TENDER_COMPLAINT_REASONS,
} from "@/lib/tender-complaint-reasons";

type Props = {
  tenderId: string;
  tenderTitle: string;
  isAuthenticated: boolean;
  loginHref: string;
};

export function TenderComplaintModal({
  tenderId,
  tenderTitle,
  isAuthenticated,
  loginHref,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonId, setReasonId] = useState<TenderComplaintReasonId | null>(
    null,
  );
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titleId = useId();
  const descId = useId();

  const reset = useCallback(() => {
    setReasonId(null);
    setDetails("");
    setSubmitting(false);
    setDone(false);
    setSubmitError(null);
  }, []);

  useEffect(() => {
    setSubmitError(null);
  }, [reasonId, details]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting]);

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    reset();
    setOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    reset();
  };

  const detailsOk =
    details.trim().length >= (reasonId === "other" ? 40 : 20);

  const canSubmit = Boolean(reasonId) && detailsOk;

  const submit = async () => {
    if (!canSubmit || !reasonId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonId,
          details: details.trim(),
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "UNKNOWN";
        const messages: Record<string, string> = {
          UNAUTHORIZED: "Մուտք գործեք և կրկին փորձեք։",
          VALIDATION: "Ստուգեք լրացված դաշտերը։",
          INVALID_REASON: "Ընտրեք պատճառը ցանկից։",
          DETAILS_TOO_SHORT: "Մանրամասները բավարար երկար չեն։",
          TENDER_NOT_FOUND: "Մրցույթը հասանելի չէ։",
          FORBIDDEN: "Պատվիրատուն չի կարող բողոքել սեփական մրցույթից։",
          UNKNOWN: "Չհաջողվեց ուղարկել։ Կրկին փորձեք։",
        };
        setSubmitError(messages[err] ?? messages.UNKNOWN);
        return;
      }
      setDone(true);
    } catch {
      setSubmitError("Ցանցի խնդիր։ Կրկին փորձեք։");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 ring-1 ring-slate-100 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Մրցույթի վերաբերյալ բողոք
            </h2>
            <p className="mt-1 text-sm font-bold leading-snug text-slate-800">
              Եթե հայտարարությունը վնասում է մրցույթին դիմողների շահերը, կարող եք
              ուղարկել բողոքը մոդերացիայի ուշադրությանը։
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50/80 sm:self-center"
          >
            <Flag className="size-4 text-amber-700" />
            Բողոքել մրցույթի մասին
          </button>
        </div>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Բողոք մոդերացիային
                </p>
                <h2
                  id={titleId}
                  className="mt-0.5 line-clamp-2 text-base font-black text-slate-900"
                  title={tenderTitle}
                >
                  {tenderTitle}
                </h2>
                <p
                  id={descId}
                  className="mt-1 font-mono text-[11px] font-semibold text-slate-400"
                >
                  ID · {tenderId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="-m-1 shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Փակել"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {done ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-black text-emerald-800">
                    Ձեր հաղորդումը գրանցվել է
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
                    Մոդերացիան կդիտարկի հաղորդումը ադմին վահանակում։
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submitError ? (
                    <p className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-900 ring-1 ring-rose-200">
                      {submitError}
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-slate-600">
                    Ընտրեք պատճառը, ապա նկարագրեք իրավիճակը՝ կարճ և հստակ։
                  </p>

                  <ul className="space-y-2">
                    {TENDER_COMPLAINT_REASONS.map((r) => {
                      const selected = reasonId === r.id;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setReasonId(r.id)}
                            className={`w-full rounded-2xl px-4 py-3 text-left ring-1 transition ${
                              selected
                                ? "bg-amber-50 ring-amber-400 shadow-sm"
                                : "bg-slate-50 ring-slate-200 hover:bg-white hover:ring-slate-300"
                            }`}
                          >
                            <p className="text-sm font-black text-slate-900">
                              {r.label}
                            </p>
                            {r.hint ? (
                              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
                                {r.hint}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      Մանրամասներ
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={5}
                      placeholder="Նկարագրեք, թե ինչն է խնդրահարույց՝ օրինակ՝ բյուջեն համեմատել շուկայական գնի հետ, կամ ինչն է բացակայում նկարագրությունից։"
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                    <p className="text-[10px] font-bold text-slate-400">
                      {reasonId === "other"
                        ? "Անհրաժեշտ է առնվազն 40 նիշ։"
                        : "Անհրաժեշտ է առնվազն 20 նիշ։"}{" "}
                      <span
                        className={
                          detailsOk ? "text-emerald-600" : "text-slate-400"
                        }
                      >
                        {details.trim().length}{" "}
                        / {reasonId === "other" ? "40+" : "20+"}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {done ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Փակել
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Չեղարկել
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Ուղարկել
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
