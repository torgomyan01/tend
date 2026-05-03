"use client";

import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

type Props = {
  tenderId: string;
  tenderTitle: string;
  counterpartName: string;
  counterpartImage: string | null;
  existingReview: {
    rating: number;
    comment: string | null;
    createdAt: string;
    moderationStatus: "PENDING" | "APPROVED";
  } | null;
};

export function TenderDedicatedReviewForm({
  tenderId,
  tenderTitle,
  counterpartName,
  counterpartImage,
  existingReview,
}: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (
    counterpartName.replace(/\s+/g, " ").charAt(0) || "?"
  ).toUpperCase();

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        if (data?.error === "ALREADY_REVIEWED") {
          setError("Դուք արդեն գնահատել եք։");
        } else if (data?.error === "REVIEW_PENDING_MODERATION") {
          setError(
            "Ձեր գնահատականը արդեն ուղարկված է և սպասում է մոդերացիայի։",
          );
        } else if (data?.error === "NOT_REVIEWABLE") {
          setError("Այս մրցույթը գնահատման համար հասանելի չէ։");
        } else if (data?.error === "FORBIDDEN") {
          setError("Մուտքը արգելված է։");
        } else {
          setError("Չհաջողվեց պահպանել գնահատականը։");
        }
        return;
      }
      router.push(ROUTES.tenderDetail(tenderId));
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setLoading(false);
    }
  };

  if (existingReview) {
    if (existingReview.moderationStatus === "PENDING") {
      return (
        <div className="rounded-3xl bg-amber-50 px-6 py-6 ring-1 ring-amber-200">
          <p className="text-sm font-black text-amber-950">
            Ձեր գնահատականը <span className="text-amber-900">{counterpartName}</span>{" "}
            ուղարկված է և սպասում է ադմին մոդերացիայի։ Հաստատվածից հետո այն կերևի
            մրցույթի էջում և կմտնի վարկանիշ։
          </p>
          <p className="mt-3 text-xs font-semibold text-amber-900/80">
            Աստղերը և տեքստը հանրությանը չեն ցուցադրվում մինչև հաստատումը։
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Ուղարկված՝ {formatDateTime(existingReview.createdAt)}
          </p>
          <Link
            href={ROUTES.tenderDetail(tenderId)}
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800"
          >
            Վերադառնալ մրցույթին
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-3xl bg-emerald-50 px-6 py-6 ring-1 ring-emerald-200">
        <p className="text-sm font-black text-emerald-950">
          Դուք արդեն գնահատել եք <span className="text-emerald-800">{counterpartName}</span>{" "}
          այս մրցույթում։
        </p>
        <div className="mt-3 flex items-center gap-1 text-amber-600">
          <Star className="size-5 fill-current" />
          <span className="font-black tabular-nums text-slate-900">
            {existingReview.rating}
          </span>
          <span className="text-sm text-slate-500">/ 5</span>
        </div>
        {existingReview.comment ? (
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-800">
            {existingReview.comment}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {formatDateTime(existingReview.createdAt)}
        </p>
        <Link
          href={ROUTES.tenderDetail(tenderId)}
          className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800"
        >
          Վերադառնալ մրցույթին
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-amber-100">
          {counterpartImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={counterpartImage}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xl font-black text-slate-600">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Գնահատում եք
          </p>
          <p className="mt-0.5 text-lg font-black text-slate-900">{counterpartName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            Միայն այս մրցույթի ընտրված զույգի համար · «{tenderTitle}»
          </p>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold leading-relaxed text-slate-600">
        Հարթակը թույլ է տալիս գնահատել միմյանց միայն այն դեպքում, երբ մրցույթը
        պաշտոնապես ավարտված է և դուք գրանցված եք որպես պատվիրատու կամ ընտրված
        կատարող տվյալ մրցույթում։
      </p>

      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
          Աստղեր (1–5)
        </p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`rounded-lg p-1.5 transition ${
                rating >= n
                  ? "text-amber-500"
                  : "text-slate-300 hover:text-slate-400"
              }`}
              aria-label={`${n} աստղ`}
            >
              <Star className="size-8 fill-current sm:size-9" />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Կարծիք (ըստ ցանկության)"
        rows={4}
        maxLength={4000}
        className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
      />

      {error ? (
        <p className="mt-3 text-xs font-bold text-rose-700">{error}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Ուղարկել գնահատականը
        </button>
        <Link
          href={ROUTES.tenderDetail(tenderId)}
          className="inline-flex items-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
        >
          Չեղարկել
        </Link>
      </div>
    </div>
  );
}
