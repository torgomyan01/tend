import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ModerationDecisionButtons } from "@/components/admin/moderation-decision-buttons";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { Prisma, ReviewModerationStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: "ALL" | ReviewModerationStatus; label: string }> =
  [
    { value: "PENDING", label: "Սպասում են" },
    { value: "APPROVED", label: "Հաստատված" },
    { value: "ALL", label: "Բոլորը" },
  ];

const STATUS_LABEL: Record<ReviewModerationStatus, string> = {
  PENDING: "Սպասում է",
  APPROVED: "Հաստատված",
};

const STATUS_BADGE: Record<ReviewModerationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`size-4 ${
            index < value ? "fill-amber-400 text-amber-500" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const requested = params.status;
  const isValid =
    requested &&
    (requested === "ALL" ||
      Boolean(STATUS_LABEL[requested as ReviewModerationStatus]));
  const filter = isValid ? (requested as string) : "PENDING";

  const where: Prisma.ReviewWhereInput =
    filter === "ALL" ? {} : { moderationStatus: filter as ReviewModerationStatus };

  const [reviews, totalCount, pendingCount, approvedTotal, avgApproved] =
    await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 80,
        include: {
          reviewer: { select: { name: true, email: true } },
          reviewee: { select: { name: true, email: true } },
          tender: { select: { id: true, title: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { moderationStatus: "PENDING" } }),
      prisma.review.count({ where: { moderationStatus: "APPROVED" } }),
      prisma.review.aggregate({
        where: { moderationStatus: "APPROVED" },
        _avg: { rating: true },
      }),
    ]);

  const averageApprovedRating = avgApproved._avg.rating
    ? Number(avgApproved._avg.rating).toFixed(2)
    : "—";

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Գնահատականներ"
        description="Նոր գնահատականները նախ ստուգվում են։ Միայն հաստատվածները մտնում են հանրային միջինների ու պատկերի մեջ։"
      />

      {pendingCount > 0 ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          Մոդերացիայի հերթում կան {formatNumber(pendingCount)} գնահատական։
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Հաստատված ընդհանուր
          </p>
          <p className="mt-2 text-3xl font-black">
            {formatNumber(approvedTotal)}
          </p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Միջին գնահատական (հաստատված)
          </p>
          <p className="mt-2 text-3xl font-black">{averageApprovedRating}</p>
        </article>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const href =
            f.value === "ALL"
              ? ROUTES.admin.reviews
              : `${ROUTES.admin.reviews}?status=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p className="text-xs font-semibold text-slate-500">
        Այս ֆիլտրով՝ {formatNumber(totalCount)} գնահատական։
      </p>

      <section className="space-y-3">
        {reviews.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <Star className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Այս ֆիլտրով գնահատականներ չեն գտնվել
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="space-y-3 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[review.moderationStatus]}`}
                    >
                      {STATUS_LABEL[review.moderationStatus]}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900">
                    <Link
                      href={ROUTES.tenderDetail(review.tender.id)}
                      className="inline-flex items-center gap-1 transition hover:text-amber-700"
                    >
                      {review.tender.title}
                      <ExternalLink className="size-3.5 shrink-0 text-slate-400" />
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Ուղարկող՝{" "}
                    <span className="text-slate-800">
                      {review.reviewer.name?.trim() || "—"}
                    </span>{" "}
                    · {review.reviewer.email}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Ստացող՝{" "}
                    <span className="text-slate-800">
                      {review.reviewee.name?.trim() || "—"}
                    </span>{" "}
                    · {review.reviewee.email}
                  </p>
                </div>
                <StarRating value={review.rating} />
              </div>

              {review.comment ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Կարծիք
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">
                    {review.comment}
                  </p>
                </div>
              ) : null}

              <p className="text-[10px] font-semibold text-slate-400">
                {formatDateTime(review.createdAt)}
              </p>

              {review.moderationStatus === "PENDING" ? (
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <ModerationDecisionButtons
                    endpoint={`/api/admin/reviews/${review.id}`}
                    approveLabel="Հաստատել հանրության համար"
                    rejectLabel="Մերժել"
                    size="sm"
                  />
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
