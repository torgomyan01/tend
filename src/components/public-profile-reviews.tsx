import { MessageSquareQuote, Star } from "lucide-react";
import Link from "next/link";
import { PublicProfileSectionHeader } from "@/components/public-profile/section-header";
import { maskApplicantDisplayName } from "@/lib/bid-teaser";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

export type PublicProfileReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  tender: { id: string; title: string };
  reviewerName: string | null;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function PublicProfileReviews({ reviews }: { reviews: PublicProfileReview[] }) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
      <PublicProfileSectionHeader
        icon={MessageSquareQuote}
        title="Կարծիքներ և գնահատականներ"
        count={reviews.length}
      />

      <ul className="mt-5 space-y-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="relative overflow-hidden rounded-3xl bg-slate-50/80 p-5 ring-1 ring-slate-200/80 transition hover:ring-amber-200/50"
          >
            <div
              className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-amber-100/40 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <StarRow rating={review.rating} />
              <time
                dateTime={review.createdAt.toISOString()}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200/80"
              >
                {formatDateTime(review.createdAt)}
              </time>
            </div>

            {review.comment?.trim() ? (
              <p className="relative mt-4 text-sm font-semibold leading-7 text-slate-700">
                {review.comment.trim()}
              </p>
            ) : (
              <p className="relative mt-4 text-sm font-semibold italic text-slate-400">
                Առանց տեքստային մեկնաբանության
              </p>
            )}

            <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200/80">
                {maskApplicantDisplayName(review.reviewerName)}
              </span>
              <span className="text-slate-300" aria-hidden>
                →
              </span>
              <Link
                href={ROUTES.tenderDetail(review.tender.id)}
                className="text-xs font-black text-amber-800 transition hover:text-amber-950 hover:underline sm:text-sm"
              >
                {review.tender.title}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
