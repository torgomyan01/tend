import Link from "next/link";
import { ExternalLink, Gavel } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ModerationDecisionButtons } from "@/components/admin/moderation-decision-buttons";
import { prisma } from "@/lib/prisma";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { BidStatus, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: "ALL" | BidStatus; label: string }> = [
  { value: "PENDING", label: "Սպասում են" },
  { value: "SHORTLISTED", label: "Հաստատված" },
  { value: "REJECTED", label: "Մերժված" },
  { value: "ACCEPTED", label: "Ընդունված" },
  { value: "WITHDRAWN", label: "Հետ վերցված" },
  { value: "ALL", label: "Բոլորը" },
];

const STATUS_LABEL: Record<BidStatus, string> = {
  PENDING: "Սպասում է",
  SHORTLISTED: "Հաստատված",
  ACCEPTED: "Ընդունված",
  REJECTED: "Մերժված",
  WITHDRAWN: "Հետ վերցված",
};

const STATUS_BADGE: Record<BidStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SHORTLISTED: "bg-emerald-100 text-emerald-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};

export default async function AdminBidsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const requested = params.status;
  const isValid =
    requested &&
    (requested === "ALL" ||
      Boolean(STATUS_LABEL[requested as BidStatus]));
  const filter = isValid ? (requested as string) : "PENDING";

  const where: Prisma.BidWhereInput =
    filter === "ALL" ? {} : { status: filter as BidStatus };

  const [bids, totalCount, pendingCount] = await Promise.all([
    prisma.bid.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        provider: {
          select: { id: true, name: true, email: true },
        },
        tender: {
          select: { id: true, title: true, category: true },
        },
      },
    }),
    prisma.bid.count({ where }),
    prisma.bid.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Առաջարկներ"
        description="Մասնագետների առաջարկները նախ ստուգվում են, որպեսզի կանխվեն կոնտակտային տվյալների ուղարկումը կամ կանոնների խախտումը։ Միայն հաստատվածները կհասնեն պատվիրատուին։"
      />

      {pendingCount > 0 ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          Մոդերացիայի հերթում կան {formatNumber(pendingCount)} առաջարկ։
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const href =
            f.value === "ALL"
              ? ROUTES.admin.bids
              : `${ROUTES.admin.bids}?status=${f.value}`;
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
        Ընդհանուր՝ {formatNumber(totalCount)} առաջարկ։
      </p>

      <section className="space-y-3">
        {bids.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <Gavel className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Առաջարկներ չեն գտնվել
            </p>
          </div>
        ) : (
          bids.map((bid) => (
            <article
              key={bid.id}
              className="space-y-3 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[bid.status]}`}
                    >
                      {STATUS_LABEL[bid.status]}
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                      {bid.tender.category}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-black text-slate-900">
                    <Link
                      href={ROUTES.tenderDetail(bid.tender.id)}
                      className="inline-flex items-center gap-1 transition hover:text-amber-700"
                    >
                      {bid.tender.title}
                      <ExternalLink className="size-3.5 shrink-0 text-slate-400" />
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Մասնագետ՝{" "}
                    <span className="text-slate-800">
                      {bid.provider.name?.trim() || "—"}
                    </span>{" "}
                    · {bid.provider.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                  <p className="text-lg font-black tabular-nums text-slate-900">
                    {formatAmd(Number(bid.price))}
                  </p>
                  {bid.timelineDays ? (
                    <p className="text-[11px] font-bold text-slate-500">
                      {bid.timelineDays} օրում
                    </p>
                  ) : null}
                  <p className="text-[10px] font-semibold text-slate-400">
                    {formatDateTime(bid.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Ուղեկից նամակ
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">
                  {bid.coverLetter}
                </p>
              </div>

              {bid.status === "PENDING" ? (
                <div className="flex justify-end">
                  <ModerationDecisionButtons
                    endpoint={`/api/admin/bids/${bid.id}`}
                    approveLabel="Թույլատրել պատվիրատուին"
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
