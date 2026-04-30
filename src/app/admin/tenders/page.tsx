import Link from "next/link";
import { BriefcaseBusiness, MapPin } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import type { Prisma, TenderStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Սևագիր",
  ACTIVE: "Ակտիվ",
  REVIEW: "Քննարկում",
  AWARDED: "Հանձնված",
  COMPLETED: "Ավարտված",
  CANCELLED: "Չեղարկված",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REVIEW: "bg-amber-100 text-amber-800",
  AWARDED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-slate-200 text-slate-800",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const FILTERS = [
  { value: "ALL", label: "Բոլորը" },
  { value: "ACTIVE", label: "Ակտիվ" },
  { value: "REVIEW", label: "Քննարկում" },
  { value: "AWARDED", label: "Հանձնված" },
  { value: "COMPLETED", label: "Ավարտված" },
  { value: "CANCELLED", label: "Չեղարկված" },
];

export default async function AdminTendersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter =
    params.status && STATUS_LABEL[params.status] ? params.status : "ALL";

  const where: Prisma.TenderWhereInput =
    statusFilter === "ALL" ? {} : { status: statusFilter as TenderStatus };

  const [tenders, totalCount] = await Promise.all([
    prisma.tender.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { bids: true },
        },
      },
    }),
    prisma.tender.count({ where }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Մրցույթներ"
        description="Հետևեք բոլոր հայտարարություններին, դրանց վիճակին և առաջարկների քանակին։"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "ALL"
                  ? ROUTES.admin.tenders
                  : `${ROUTES.admin.tenders}?status=${filter.value}`
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <p className="text-xs font-semibold text-slate-500">
        Ընդհանուր՝ {formatNumber(totalCount)} մրցույթ։
      </p>

      <section className="space-y-3">
        {tenders.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <BriefcaseBusiness className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Մրցույթներ չեն գտնվել
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Այս ֆիլտրի համար արդյունք չկա։
            </p>
          </div>
        ) : (
          tenders.map((tender) => (
            <article
              key={tender.id}
              className="flex flex-col gap-3 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[tender.status]}`}
                  >
                    {STATUS_LABEL[tender.status]}
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    {tender.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    · {tender.service}
                  </span>
                </div>
                <h3 className="mt-2 truncate text-lg font-black text-slate-900">
                  {tender.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>Հաճախորդ՝ {tender.client.name || tender.client.email}</span>
                  {tender.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {tender.city}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Բյուջե
                  </p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">
                    {tender.budgetMin || tender.budgetMax
                      ? `${formatAmd(Number(tender.budgetMin ?? 0))} – ${formatAmd(Number(tender.budgetMax ?? tender.budgetMin ?? 0))}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Առաջարկներ
                  </p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">
                    {tender._count.bids}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Ստեղծվել
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-700">
                    {formatDateTime(tender.createdAt)}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
