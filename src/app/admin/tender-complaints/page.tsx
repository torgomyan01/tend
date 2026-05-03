import { ExternalLink, Flag } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ModerationDecisionButtons } from "@/components/admin/moderation-decision-buttons";
import { formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { tenderComplaintReasonLabel } from "@/lib/tender-complaint-reasons";
import type { Prisma, TenderComplaintStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TenderComplaintStatus, string> = {
  PENDING: "Սպասում է",
  REVIEWED: "Դիտարկված",
  DISMISSED: "Մերժված",
};

const STATUS_BADGE: Record<TenderComplaintStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  REVIEWED: "bg-emerald-100 text-emerald-800",
  DISMISSED: "bg-slate-100 text-slate-700",
};

const FILTERS: Array<{ value: "ALL" | TenderComplaintStatus; label: string }> =
  [
    { value: "PENDING", label: "Սպասում են" },
    { value: "REVIEWED", label: "Դիտարկված" },
    { value: "DISMISSED", label: "Մերժված" },
    { value: "ALL", label: "Բոլորը" },
  ];

export default async function AdminTenderComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const requested = params.status;
  const valid =
    requested &&
    (requested === "ALL" ||
      Boolean(STATUS_LABEL[requested as TenderComplaintStatus]));
  const filter = valid ? (requested as string) : "PENDING";

  const where: Prisma.TenderComplaintWhereInput =
    filter === "ALL" ? {} : { status: filter as TenderComplaintStatus };

  const [complaints, total, pendingCount] = await Promise.all([
    prisma.tenderComplaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        tender: { select: { id: true, title: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.tenderComplaint.count({ where }),
    prisma.tenderComplaint.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Մրցույթների բողոքներ"
        description="Օգտատերերի հաղորդումները ակտիվ մրցույթների վերաբերյալ՝ ստուգման հերթում։"
      />

      {pendingCount > 0 ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          Մոդերացիայի հերթում կան {formatNumber(pendingCount)} բողոք։
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const href =
            f.value === "ALL"
              ? ROUTES.admin.tenderComplaints
              : `${ROUTES.admin.tenderComplaints}?status=${f.value}`;
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
        Ընդհանուր՝ {formatNumber(total)} գրառում։
      </p>

      <section className="space-y-3">
        {complaints.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <Flag className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Բողոքներ չեն գտնվել
            </p>
          </div>
        ) : (
          complaints.map((row) => {
            const reasonLabel =
              tenderComplaintReasonLabel(row.reasonId) ?? row.reasonId;
            return (
              <article
                key={row.id}
                className="space-y-3 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                      <Link
                        href={ROUTES.tenderDetail(row.tender.id)}
                        className="inline-flex items-center gap-1 transition hover:text-amber-900"
                      >
                        {row.tender.title}
                        <ExternalLink className="size-3 shrink-0" />
                      </Link>
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Հաղորդող՝{" "}
                      <span className="text-slate-900">
                        {row.reporter.name?.trim() || "—"}
                      </span>{" "}
                      · {row.reporter.email}
                    </p>
                    <p className="mt-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      {reasonLabel}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">
                      {row.details}
                    </p>
                    {row.moderatorNote ? (
                      <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        Մոդերատորի նշում՝ {row.moderatorNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${STATUS_BADGE[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                </div>

                {row.status === "PENDING" ? (
                  <div className="flex justify-end">
                    <ModerationDecisionButtons
                      endpoint={`/api/admin/tender-complaints/${row.id}`}
                      approveAction="REVIEWED"
                      rejectAction="DISMISSED"
                      approveLabel="Դիտարկվել է"
                      rejectLabel="Մերժել"
                      size="sm"
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
