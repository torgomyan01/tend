import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  MapPin,
  PlusCircle,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import {
  BID_STATUS_BADGE,
  BID_STATUS_LABEL,
  TENDER_STATUS_BADGE,
  TENDER_STATUS_LABEL,
} from "@/lib/tender-status";
import type { Prisma, Tender, TenderStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const MY_FILTERS: { value: "ALL" | TenderStatus; label: string }[] = [
  { value: "ALL", label: "Բոլորը" },
  { value: "DRAFT", label: TENDER_STATUS_LABEL.DRAFT },
  { value: "ACTIVE", label: TENDER_STATUS_LABEL.ACTIVE },
  { value: "REVIEW", label: TENDER_STATUS_LABEL.REVIEW },
  { value: "AWARDED", label: TENDER_STATUS_LABEL.AWARDED },
  { value: "COMPLETED", label: TENDER_STATUS_LABEL.COMPLETED },
  { value: "CANCELLED", label: TENDER_STATUS_LABEL.CANCELLED },
];

function loginRedirectUrl(pathWithQuery: string) {
  return `${ROUTES.login}?callbackUrl=${encodeURIComponent(pathWithQuery)}`;
}

function buildMyTendersHref(status: string) {
  if (status === "ALL") return ROUTES.myTenders;
  return `${ROUTES.tenders}?scope=my&status=${status}`;
}

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  const params = await searchParams;
  const scope =
    params.scope === "my" || params.scope === "bids"
      ? params.scope
      : undefined;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (scope === "my" || scope === "bids") {
    if (!userId) {
      const path =
        scope === "my"
          ? ROUTES.myTenders
          : `${ROUTES.tenders}?scope=bids`;
      redirect(loginRedirectUrl(path));
    }
  }

  const statusFilter =
    scope === "my" && params.status && params.status !== "ALL"
      ? MY_FILTERS.some((f) => f.value === params.status)
        ? (params.status as TenderStatus)
        : undefined
      : undefined;

  const myWhere: Prisma.TenderWhereInput =
    scope === "my" && userId
      ? {
          clientId: userId,
          ...(statusFilter ? { status: statusFilter } : {}),
        }
      : { id: "__none__" };

  const publicWhere: Prisma.TenderWhereInput = {
    status: "ACTIVE",
    OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
  };

  let view:
    | { type: "public" }
    | { type: "my"; statusParam: string }
    | { type: "bids" } = { type: "public" };
  if (scope === "my") {
    view = {
      type: "my",
      statusParam:
        params.status && MY_FILTERS.some((f) => f.value === params.status)
          ? params.status
          : "ALL",
    };
  } else if (scope === "bids") {
    view = { type: "bids" };
  }

  const [publicTenders, myTenders, myCount, bidsList, bidCount] =
    await Promise.all([
      scope
        ? []
        : prisma.tender.findMany({
            where: publicWhere,
            orderBy: { createdAt: "desc" },
            take: 80,
            include: {
              _count: { select: { bids: true } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          }),
      scope === "my" && userId
        ? prisma.tender.findMany({
            where: myWhere,
            orderBy: { updatedAt: "desc" },
            take: 80,
            include: {
              _count: { select: { bids: true } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          })
        : [],
      scope === "my" && userId
        ? prisma.tender.count({ where: { clientId: userId } })
        : 0,
      scope === "bids" && userId
        ? prisma.bid.findMany({
            where: { providerId: userId },
            orderBy: { updatedAt: "desc" },
            take: 80,
            include: {
              tender: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  city: true,
                  category: true,
                  service: true,
                  endsAt: true,
                  budgetMin: true,
                  budgetMax: true,
                  _count: { select: { bids: true } },
                },
              },
            },
          })
        : [],
      scope === "bids" && userId
        ? prisma.bid.count({ where: { providerId: userId } })
        : 0,
    ]);

  const eyebrow =
    view.type === "my"
      ? "Պատվիրատու"
      : view.type === "bids"
        ? "Մասնագետ"
        : "Հարթակ";
  const title =
    view.type === "my"
      ? "Իմ մրցույթներ"
      : view.type === "bids"
        ? "Իմ առաջարկներ"
        : "Մրցույթներ";
  const description =
    view.type === "my"
      ? "Դուք տեղադրած հայտարարությունները՝ կարգավիճակով, առաջարկների թվով և արագ հղումով մանրամասների էջ։"
      : view.type === "bids"
        ? "Ձեր ուղարկած առաջարկները՝ կապված մրցույթների հետ։"
        : "Ակտիվ մրցույթներ, որոնցում կարող եք մասնակցել որպես մասնագետ։";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
              {description}
            </p>

            <nav
              className="mt-6 flex flex-wrap gap-2"
              aria-label="Մրցույթների տեսք"
            >
              <Link
                href={ROUTES.tenders}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black transition ${
                  view.type === "public"
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                Բոլորը
              </Link>
              <Link
                href={ROUTES.myTenders}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black transition ${
                  view.type === "my"
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                Իմ մրցույթներ
              </Link>
              <Link
                href={ROUTES.bidHistory}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black transition ${
                  view.type === "bids"
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                Իմ առաջարկներ
              </Link>
            </nav>

            {view.type === "my" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {MY_FILTERS.map((filter) => {
                  const isActive = view.statusParam === filter.value;
                  return (
                    <Link
                      key={filter.value}
                      href={buildMyTendersHref(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                        isActive
                          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {view.type === "my" ? (
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Ընդհանուր՝ {formatNumber(myCount)} մրցույթ ձեր հաշվում։
              </p>
            ) : null}
            {view.type === "bids" ? (
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Ընդհանուր՝ {formatNumber(bidCount)} առաջարկ։
              </p>
            ) : null}
          </section>

          {view.type === "public" ? (
            <section className="space-y-3">
              {publicTenders.length === 0 ? (
                <EmptyState
                  icon={<BriefcaseBusiness className="mx-auto size-10 text-slate-300" />}
                  title="Այս պահին ակտիվ մրցույթներ չկան"
                  subtitle="Մի փոքր հետո ստուգեք նորից կամ պատվիրատու եղեք՝ սեփական մրցույթ տեղադրելու համար։"
                  action={
                    <Link
                      href={ROUTES.createTender}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      <PlusCircle className="size-4" />
                      Տեղադրել մրցույթ
                    </Link>
                  }
                />
              ) : (
                publicTenders.map((tender) => (
                  <TenderRow
                    key={tender.id}
                    href={ROUTES.tenderDetail(tender.id)}
                    status={tender.status}
                    category={tender.category}
                    service={tender.service}
                    title={tender.title}
                    city={tender.city}
                    budgetMin={tender.budgetMin}
                    budgetMax={tender.budgetMax}
                    bidCount={tender._count.bids}
                    createdAt={tender.createdAt}
                    thumbUrl={tender.images[0]?.url ?? null}
                    endsAt={tender.endsAt}
                  />
                ))
              )}
            </section>
          ) : null}

          {view.type === "my" ? (
            <section className="space-y-3">
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  href={ROUTES.createTender}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  <PlusCircle className="size-4" />
                  Նոր մրցույթ
                </Link>
              </div>
              {myTenders.length === 0 ? (
                <EmptyState
                  icon={<BriefcaseBusiness className="mx-auto size-10 text-slate-300" />}
                  title="Դեռ մրցույթ չունեք"
                  subtitle="Սկսեք առաջին հայտարարությունից՝ նկարագրեք աշխատանքը և ստացեք առաջարկներ։"
                  action={
                    <Link
                      href={ROUTES.createTender}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      Տեղադրել մրցույթ
                      <ArrowRight className="size-4" />
                    </Link>
                  }
                />
              ) : (
                myTenders.map((tender) => (
                  <TenderRow
                    key={tender.id}
                    href={ROUTES.tenderDetail(tender.id)}
                    status={tender.status}
                    category={tender.category}
                    service={tender.service}
                    title={tender.title}
                    city={tender.city}
                    budgetMin={tender.budgetMin}
                    budgetMax={tender.budgetMax}
                    bidCount={tender._count.bids}
                    createdAt={tender.updatedAt}
                    metaLabel="Թարմացվել է"
                    thumbUrl={tender.images[0]?.url ?? null}
                    endsAt={tender.endsAt}
                  />
                ))
              )}
            </section>
          ) : null}

          {view.type === "bids" ? (
            <section className="space-y-3">
              {bidsList.length === 0 ? (
                <EmptyState
                  icon={<BriefcaseBusiness className="mx-auto size-10 text-slate-300" />}
                  title="Առաջարկներ դեռ չունեք"
                  subtitle="Դիտեք ակտիվ մրցույթները և ուղարկեք առաջարկ՝ գին ու ժամկետով։"
                  action={
                    <Link
                      href={ROUTES.tenders}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      Դեպի մրցույթներ
                      <ChevronRight className="size-4" />
                    </Link>
                  }
                />
              ) : (
                bidsList.map((bid) => {
                  const t = bid.tender;
                  return (
                    <article
                      key={bid.id}
                      className="flex flex-col gap-4 rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${BID_STATUS_BADGE[bid.status]}`}
                          >
                            {BID_STATUS_LABEL[bid.status]}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${TENDER_STATUS_BADGE[t.status]}`}
                          >
                            Մրցույթ՝ {TENDER_STATUS_LABEL[t.status]}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-black text-slate-900">
                          <Link
                            href={ROUTES.tenderDetail(t.id)}
                            className="transition hover:text-amber-800"
                          >
                            {t.title}
                          </Link>
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                          <span>{t.category}</span>
                          <span>· {t.service}</span>
                          {t.city ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" /> {t.city}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Ձեր գինը
                          </p>
                          <p className="mt-0.5 text-sm font-black text-slate-900">
                            {formatAmd(Number(bid.price))}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Առաջարկներ
                          </p>
                          <p className="mt-0.5 text-sm font-black text-slate-900">
                            {t._count.bids}
                          </p>
                        </div>
                        <Link
                          href={ROUTES.tenderDetail(t.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100"
                        >
                          Մանրամասներ
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
      {icon}
      <p className="mt-3 text-lg font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

function TenderRow({
  href,
  status,
  category,
  service,
  title,
  city,
  budgetMin,
  budgetMax,
  bidCount,
  createdAt,
  metaLabel = "Ստեղծվել է",
  thumbUrl,
  endsAt,
}: {
  href: string;
  status: TenderStatus;
  category: string;
  service: string;
  title: string;
  city: string | null;
  budgetMin: Tender["budgetMin"];
  budgetMax: Tender["budgetMax"];
  bidCount: number;
  createdAt: Date;
  metaLabel?: string;
  thumbUrl: string | null;
  endsAt: Date | null;
}) {
  const budgetText =
    budgetMin || budgetMax
      ? `${formatAmd(Number(budgetMin ?? 0))} – ${formatAmd(
          Number(budgetMax ?? budgetMin ?? 0),
        )}`
      : "—";

  return (
    <article className="rounded-4xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <Link
        href={href}
        className="flex flex-col gap-3 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-5"
      >
        {thumbUrl ? (
          <div className="shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 sm:size-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt=""
              className="size-full object-cover lg:size-28"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${TENDER_STATUS_BADGE[status]}`}
            >
              {TENDER_STATUS_LABEL[status]}
            </span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              {category}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              · {service}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-lg font-black text-slate-900">
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            {city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 shrink-0" /> {city}
              </span>
            ) : null}
            {endsAt ? (
              <span>
                Վերջնաժամկետ՝ {formatDateTime(endsAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 lg:flex-nowrap lg:border-0 lg:pt-0">
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Բյուջե
            </p>
            <p className="mt-0.5 text-sm font-black text-slate-900">
              {budgetText}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Առաջարկներ
            </p>
            <p className="mt-0.5 text-sm font-black text-slate-900">{bidCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {metaLabel}
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-700">
              {formatDateTime(createdAt)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-black text-amber-800 lg:ml-2">
            Բացել
            <ChevronRight className="size-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}
