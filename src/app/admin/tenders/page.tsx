import Link from "next/link";
import {
  BriefcaseBusiness,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTenderActions } from "@/components/admin/admin-tender-actions";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import type { Prisma, TenderStatus } from "@/generated/prisma/client";
import {
  BID_STATUS_BADGE,
  BID_STATUS_LABEL,
  TENDER_STATUS_BADGE,
  TENDER_STATUS_LABEL,
} from "@/lib/tender-status";

const BIDS_PER_TENDER_CAP = 80;

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "ALL", label: "Բոլորը" },
  { value: "REVIEW", label: TENDER_STATUS_LABEL.REVIEW },
  { value: "DRAFT", label: TENDER_STATUS_LABEL.DRAFT },
  { value: "ACTIVE", label: TENDER_STATUS_LABEL.ACTIVE },
  { value: "AWARDED", label: TENDER_STATUS_LABEL.AWARDED },
  { value: "COMPLETED", label: TENDER_STATUS_LABEL.COMPLETED },
  { value: "CANCELLED", label: TENDER_STATUS_LABEL.CANCELLED },
  {
    value: "EXPIRED_UNAWARDED",
    label: TENDER_STATUS_LABEL.EXPIRED_UNAWARDED,
  },
];

export default async function AdminTendersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const requestedStatus = params.status;
  const isValidStatus =
    requestedStatus &&
    (requestedStatus === "ALL" ||
      Boolean(TENDER_STATUS_LABEL[requestedStatus as TenderStatus]));
  const statusFilter = isValidStatus ? (requestedStatus as string) : "ALL";

  const where: Prisma.TenderWhereInput =
    statusFilter === "ALL" ? {} : { status: statusFilter as TenderStatus };

  const [tenders, totalCount, reviewCount] = await Promise.all([
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
            telegramChatId: true,
            isBlocked: true,
          },
        },
        bids: {
          orderBy: { createdAt: "desc" },
          take: BIDS_PER_TENDER_CAP,
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                telegramChatId: true,
                isVerified: true,
                isBlocked: true,
              },
            },
          },
        },
        _count: {
          select: { bids: true },
        },
      },
    }),
    prisma.tender.count({ where }),
    prisma.tender.count({ where: { status: "REVIEW" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Մրցույթներ"
        description="Նոր հրապարակումները նախ անցնում են ստուգում։ Հաստատեք կամ մերժեք մինչև դրանք երևան հանրությանը։"
      />

      {reviewCount > 0 ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          Մոդերացիայի հերթում կան {formatNumber(reviewCount)} մրցույթ։
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={`${ROUTES.admin.tenders}?status=${filter.value}`}
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
          tenders.map((tender) => {
            const bidTotal = tender._count.bids;
            const bidsTruncated = bidTotal > tender.bids.length;

            return (
              <article
                key={tender.id}
                className="flex flex-col gap-4 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${TENDER_STATUS_BADGE[tender.status]}`}
                      >
                        {TENDER_STATUS_LABEL[tender.status]}
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                        {tender.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        · {tender.service}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-lg font-black text-slate-900">
                      <Link
                        href={ROUTES.tenderDetail(tender.id)}
                        className="inline-flex items-center gap-1 transition hover:text-amber-700"
                      >
                        {tender.title}
                        <ExternalLink className="size-3.5 shrink-0 text-slate-400" />
                      </Link>
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      <span>
                        Հաճախորդ՝ {tender.client.name || tender.client.email}
                      </span>
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
                        {bidTotal}
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
                    <AdminTenderActions
                      tenderId={tender.id}
                      status={tender.status}
                      clientTelegramChatId={tender.client.telegramChatId}
                      clientIsBlocked={tender.client.isBlocked}
                      editDefaults={{
                        title: tender.title,
                        description: tender.description,
                        category: tender.category,
                        service: tender.service,
                        city: tender.city,
                        budgetMin:
                          tender.budgetMin !== null
                            ? Number(tender.budgetMin)
                            : null,
                        budgetMax:
                          tender.budgetMax !== null
                            ? Number(tender.budgetMax)
                            : null,
                        status: tender.status,
                      }}
                    />
                  </div>
                </div>

                {bidTotal === 0 ? (
                  <p className="text-xs font-semibold text-slate-500">
                    Այս մրցույթին դեռ առաջարկ չկա։
                  </p>
                ) : (
                  <details className="group rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-slate-900 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        <span>
                          Առաջարկներ՝ {bidTotal}
                          {bidsTruncated ? (
                            <span className="ml-1 font-semibold text-slate-500">
                              (ցուցադրված՝ առաջին {tender.bids.length})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs font-bold text-amber-700 group-open:hidden">
                          Բացել
                        </span>
                        <span className="hidden text-xs font-bold text-amber-700 group-open:inline">
                          Փակել
                        </span>
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-slate-200 p-4 pt-3">
                      {tender.bids.map((bid) => {
                        const p = bid.provider;
                        return (
                          <div
                            key={bid.id}
                            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900">
                                  {p.name || p.email}
                                </p>
                                <div className="mt-2 flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="inline-flex max-w-full items-center gap-1.5 break-all text-sky-700 hover:underline"
                                  >
                                    <Mail className="size-3.5 shrink-0" />
                                    {p.email}
                                  </a>
                                  {p.phone ? (
                                    <a
                                      href={`tel:${p.phone.replace(/\s/g, "")}`}
                                      className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline"
                                    >
                                      <Phone className="size-3.5 shrink-0" />
                                      {p.phone}
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                                      <Phone className="size-3.5 shrink-0" />
                                      Հեռախոս չկա
                                    </span>
                                  )}
                                  <span className="inline-flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${p.telegramChatId ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}
                                    >
                                      <MessageCircle className="size-3" />
                                      Telegram{" "}
                                      {p.telegramChatId ? "կապված" : "չկապված"}
                                    </span>
                                    {p.isBlocked ? (
                                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-800 ring-1 ring-rose-200">
                                        Արգելափակված
                                      </span>
                                    ) : null}
                                    {!p.isVerified ? (
                                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
                                        Անձը չի վերիֆիկացված
                                      </span>
                                    ) : null}
                                  </span>
                                  <p className="text-[11px] font-mono font-semibold text-slate-400">
                                    User ID՝ {p.id}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${BID_STATUS_BADGE[bid.status]}`}
                                >
                                  {BID_STATUS_LABEL[bid.status]}
                                </span>
                                <p className="text-lg font-black text-slate-900">
                                  {formatAmd(Number(bid.price))}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Միջնորդավճար՝{" "}
                                  {formatAmd(Number(bid.bidFeeAmount))}
                                </p>
                              </div>
                            </div>
                            {bid.timelineDays !== null &&
                            bid.timelineDays !== undefined ? (
                              <p className="mt-2 text-xs font-semibold text-slate-600">
                                Ժամկետ՝ մինչև{" "}
                                <span className="font-black">
                                  {bid.timelineDays}
                                </span>{" "}
                                աշխատանքային օր
                              </p>
                            ) : null}
                            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                Ծածկագիր / ներկայացում
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-slate-800">
                                {bid.coverLetter}
                              </p>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold text-slate-400">
                              Ուղարկված՝ {formatDateTime(bid.createdAt)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
