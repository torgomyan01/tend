import { Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function AdminReviewsPage() {
  const [reviews, total, avgRating] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        reviewer: { select: { name: true, email: true } },
        reviewee: { select: { name: true, email: true } },
        tender: { select: { title: true } },
      },
    }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);

  const averageRating = avgRating._avg.rating ? Number(avgRating._avg.rating).toFixed(2) : "—";

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Կարծիքներ"
        description="Հարթակի օգտատերերի թողած գնահատականները։"
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ընդհանուր
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(total)}</p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Միջին գնահատական
          </p>
          <p className="mt-2 text-3xl font-black">{averageRating}</p>
        </article>
      </section>

      <section className="space-y-3">
        {reviews.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <Star className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Կարծիքներ դեռ չկան
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    {review.tender.title}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {review.reviewer.name || review.reviewer.email}
                    <span className="font-normal text-slate-500"> → </span>
                    {review.reviewee.name || review.reviewee.email}
                  </p>
                </div>
                <StarRating value={review.rating} />
              </div>
              {review.comment ? (
                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  {review.comment}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-slate-500">
                {formatDateTime(review.createdAt)}
              </p>
            </article>
          ))
        )}
      </section>
    </>
  );
}
