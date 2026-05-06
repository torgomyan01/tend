"use client";

import { CheckCircle2, Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { TenderStatus } from "@/generated/prisma/client";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export type TenderLifecycleReview = {
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  moderationStatus: "PENDING" | "APPROVED";
};

type Props = {
  tenderId: string;
  status: TenderStatus;
  isOwner: boolean;
  isWinner: boolean;
  clientId: string;
  winnerProviderId: string | null;
  clientDisplayName: string;
  winnerDisplayName: string;
  viewerId: string | null;
  reviews: TenderLifecycleReview[];
};

export function TenderAwardLifecyclePanel({
  tenderId,
  status,
  isOwner,
  isWinner,
  clientId,
  winnerProviderId,
  clientDisplayName,
  winnerDisplayName,
  viewerId,
  reviews,
}: Props) {
  const router = useRouter();
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const ownerReview = reviews.find(
    (r) => r.reviewerId === clientId && r.revieweeId === winnerProviderId,
  );
  const providerReview = winnerProviderId
    ? reviews.find(
        (r) =>
          r.reviewerId === winnerProviderId && r.revieweeId === clientId,
      )
    : undefined;

  const canSubmitReview =
    status === "COMPLETED" &&
    viewerId &&
    winnerProviderId &&
    (viewerId === clientId || viewerId === winnerProviderId);

  const alreadyReviewed =
    viewerId === clientId
      ? Boolean(ownerReview)
      : viewerId === winnerProviderId
        ? Boolean(providerReview)
        : true;

  const counterpartLabel =
    viewerId === clientId ? winnerDisplayName : clientDisplayName;

  const submitComplete = async () => {
    setCompleteLoading(true);
    setCompleteError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        const msg = "Չհաջողվեց փակել մրցույթը։";
        setCompleteError(msg);
        toastError("Մրցույթը չփակվեց", msg);
        return;
      }
      toastSuccess("Մրցույթը փակված է", "Հիմա կարող եք փոխադարձ գնահատական թողնել։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setCompleteError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setCompleteLoading(false);
    }
  };

  const submitReview = async () => {
    if (!viewerId || !winnerProviderId) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        if (data?.error === "ALREADY_REVIEWED") {
          const msg = "Դուք արդեն գնահատել եք։";
          setReviewError(msg);
          toastError("Չի կարող պահպանել", msg);
        } else if (data?.error === "REVIEW_PENDING_MODERATION") {
          const msg =
            "Ձեր գնահատականը արդեն ուղարկված է և սպասում է մոդերացիայի։";
          setReviewError(msg);
          toastError("Սպասում է մոդերացիայի", msg);
        } else {
          const msg = "Չհաջողվեց պահպանել գնահատականը։";
          setReviewError(msg);
          toastError("Սխալ", msg);
        }
        return;
      }
      setReviewComment("");
      toastSuccess("Գնահատականը ուղարկվեց", "Շնորհակալություն։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setReviewError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setReviewLoading(false);
    }
  };

  if (status !== "AWARDED" && status !== "COMPLETED") {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Կատարման փուլ
      </h2>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
        <Link
          href={ROUTES.userProfile(clientId)}
          className="font-black text-slate-800 hover:underline"
        >
          {clientDisplayName}
        </Link>
        {winnerProviderId ? (
          <>
            <span className="text-slate-300">·</span>
            <Link
              href={ROUTES.userProfile(winnerProviderId)}
              className="font-black text-slate-800 hover:underline"
            >
              {winnerDisplayName}
            </Link>
          </>
        ) : null}
      </div>

      {status === "AWARDED" && isWinner ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-indigo-900 ring-1 ring-indigo-200">
          Պատվիրատուն կփակի մրցույթը աշխատանքի լիարժեք ավարտից հետո՝ փոխադարձ
          գնահատականների համար։
        </p>
      ) : null}

      {status === "AWARDED" && isOwner ? (
        <div className="rounded-2xl bg-indigo-50 px-4 py-4 ring-1 ring-indigo-200">
          <p className="text-sm font-bold text-indigo-950">
            Երբ աշխատանքը ամբողջովին ավարտված լինի, փակեք մրցույթը՝ փոխադարձ
            գնահատականների համար։
          </p>
          <button
            type="button"
            disabled={completeLoading}
            onClick={() => void submitComplete()}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {completeLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Ավարտված է աշխատանքը · փակել մրցույթը
          </button>
          {completeError ? (
            <p className="mt-2 text-xs font-bold text-rose-700">{completeError}</p>
          ) : null}
        </div>
      ) : null}

      {status === "COMPLETED" ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700">
            Մրցույթը փակված է։ Կարող եք փոխադարձ գնահատական թողնել միմյանց։ Նաև կարող եք
            օգտվել{" "}
            <Link
              href={ROUTES.tenderReview(tenderId)}
              className="font-black text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950"
            >
              գնահատման առանձին էջից
            </Link>
            , որտեղ ստուգվում է, որ դուք պատվիրատու կամ ընտրված կատարող եք այս
            մրցույթում։
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Պատվիրատու → կատարող
              </p>
              {ownerReview ? (
                <div className="mt-2">
                  {ownerReview.moderationStatus === "APPROVED" ? (
                    <>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="size-4 fill-current" />
                        <span className="font-black tabular-nums text-slate-900">
                          {ownerReview.rating}
                        </span>
                        <span className="text-xs text-slate-500">/ 5</span>
                      </div>
                      {ownerReview.comment ? (
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">
                          {ownerReview.comment}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-semibold text-slate-400">
                        {formatDateTime(ownerReview.createdAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold leading-relaxed text-amber-900">
                      Սպասում է մոդերացիայի։ Հաստատվածից հետո գնահատականը կերևի
                      այստեղ և կմտնի հանրային վարկանիշ։
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Դեռ գնահատված չէ։
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Կատարող → պատվիրատու
              </p>
              {providerReview ? (
                <div className="mt-2">
                  {providerReview.moderationStatus === "APPROVED" ? (
                    <>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="size-4 fill-current" />
                        <span className="font-black tabular-nums text-slate-900">
                          {providerReview.rating}
                        </span>
                        <span className="text-xs text-slate-500">/ 5</span>
                      </div>
                      {providerReview.comment ? (
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">
                          {providerReview.comment}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-semibold text-slate-400">
                        {formatDateTime(providerReview.createdAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold leading-relaxed text-amber-900">
                      Սպասում է մոդերացիայի։ Հաստատվածից հետո գնահատականը կերևի
                      այստեղ և կմտնի հանրային վարկանիշ։
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Դեռ գնահատված չէ։
                </p>
              )}
            </div>
          </div>

          {canSubmitReview && !alreadyReviewed ? (
            <div className="rounded-2xl bg-amber-50/80 px-4 py-4 ring-1 ring-amber-200">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">
                Ձեր գնահատականը — {counterpartLabel}
              </p>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className={`rounded-lg p-1.5 transition ${
                      reviewRating >= n
                        ? "text-amber-500"
                        : "text-slate-300 hover:text-slate-400"
                    }`}
                    aria-label={`${n} աստղ`}
                  >
                    <Star className="size-7 fill-current" />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Կարծիք (ըստ ցանկության)"
                rows={3}
                maxLength={4000}
                className="mt-3 w-full resize-none rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              {reviewError ? (
                <p className="mt-2 text-xs font-bold text-rose-700">{reviewError}</p>
              ) : null}
              <button
                type="button"
                disabled={reviewLoading}
                onClick={() => void submitReview()}
                className="mt-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {reviewLoading ? (
                  <Loader2 className="inline size-4 animate-spin" />
                ) : (
                  "Ուղարկել գնահատականը"
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
