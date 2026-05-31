import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  AccountAnalytics,
  type AnalyticsSlice,
  type MonthlyActivity,
} from "@/components/account-analytics";
import { AccountSignOut } from "@/components/account-sign-out";
import { AccountTypeBadge } from "@/components/account-type-badge";
import { SiteHeader } from "@/components/site-header";
import {
  type AccountTypeValue,
  isLegalEntity,
} from "@/lib/account-type";
import { authOptions } from "@/lib/auth";
import { initialsFromName } from "@/lib/bid-teaser";
import { formatAmd, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import {
  TENDER_STATUS_BADGE,
  TENDER_STATUS_LABEL,
} from "@/lib/tender-status";
import type { TenderStatus, TransactionType } from "@/generated/prisma/client";

const TRANSACTION_LABEL: Record<TransactionType, string> = {
  DEPOSIT: "Համալրում",
  BID_FEE: "Մասնակցության վճար",
  SUBSCRIPTION: "Բաժանորդագրություն",
  REFUND: "Վերադարձ",
  ADJUSTMENT: "Ճշգրտում",
  PROFILE_CONTACT_UNLOCK: "Կոնտակտների բացում",
};

const CREDIT_TYPES = new Set<TransactionType>(["DEPOSIT", "REFUND"]);

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const userId = session.user.id;
  const activitySince = new Date();
  activitySince.setHours(0, 0, 0, 0);
  activitySince.setMonth(activitySince.getMonth() - 5, 1);

  const [
    user,
    tenderCount,
    activeTenderCount,
    bidCount,
    wonBidCount,
    tenderStatusCounts,
    bidStatusCounts,
    likesCount,
    ratingAgg,
    pendingReviewsReceivedCount,
    myTendersPreview,
    transactions,
    latestVerificationRequest,
    tenderActivityRows,
    bidActivityRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        accountType: true,
        companyName: true,
        createdAt: true,
        walletBalance: true,
        telegramChatId: true,
        telegramVerifiedAt: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { endsAt: "desc" },
          take: 1,
          select: {
            monthlyBidLimit: true,
            usedBidCount: true,
            endsAt: true,
          },
        },
      },
    }),
    prisma.tender.count({ where: { clientId: userId } }),
    prisma.tender.count({
      where: { clientId: userId, status: { in: ["ACTIVE", "REVIEW"] } },
    }),
    prisma.bid.count({ where: { providerId: userId } }),
    prisma.bid.count({ where: { providerId: userId, status: "ACCEPTED" } }),
    prisma.tender.groupBy({
      by: ["status"],
      where: { clientId: userId },
      _count: { _all: true },
    }),
    prisma.bid.groupBy({
      by: ["status"],
      where: { providerId: userId },
      _count: { _all: true },
    }),
    prisma.tenderLike.count({ where: { userId } }),
    prisma.review.aggregate({
      where: { revieweeId: userId, moderationStatus: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.count({
      where: { revieweeId: userId, moderationStatus: "PENDING" },
    }),
    prisma.tender.findMany({
      where: { clientId: userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        _count: { select: { bids: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        createdAt: true,
        description: true,
      },
    }),
    prisma.verificationRequest.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      select: {
        status: true,
      },
    }),
    prisma.tender.findMany({
      where: { clientId: userId, createdAt: { gte: activitySince } },
      select: { createdAt: true },
    }),
    prisma.bid.findMany({
      where: { providerId: userId, createdAt: { gte: activitySince } },
      select: { createdAt: true },
    }),
  ]);

  if (!user) {
    redirect(ROUTES.login);
  }

  const accountType = user.accountType as AccountTypeValue;
  const isLegal = isLegalEntity(accountType);
  const displayName =
    isLegal && user.companyName?.trim()
      ? user.companyName.trim()
      : user.name || "Tend.am օգտատեր";

  const activeSubscription = user.subscriptions[0] ?? null;
  const remainingBids = activeSubscription
    ? Math.max(activeSubscription.monthlyBidLimit - activeSubscription.usedBidCount, 0)
    : 0;
  const walletBalance = Number(user.walletBalance);
  const isFullyVerified = latestVerificationRequest?.status === "APPROVED";
  const isTelegramLinked = Boolean(user.telegramVerifiedAt);
  const avgRating =
    ratingAgg._avg.rating !== null && ratingAgg._avg.rating !== undefined
      ? Number(ratingAgg._avg.rating)
      : null;
  const successRate = bidCount > 0 ? wonBidCount / bidCount : 0;
  const tenderByStatus = new Map(
    tenderStatusCounts.map((row) => [row.status, row._count._all]),
  );
  const bidsByStatus = new Map(
    bidStatusCounts.map((row) => [row.status, row._count._all]),
  );

  const MONTH_LABELS = [
    "Հնվ", "Փտվ", "Մրտ", "Ապր", "Մյս", "Հնս",
    "Հլս", "Օգս", "Սպտ", "Հկտ", "Նյմ", "Դկտ",
  ];
  const monthBuckets: MonthlyActivity[] = [];
  const monthIndex = new Map<string, number>();
  const cursor = new Date(activitySince);
  for (let i = 0; i < 6; i += 1) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    monthIndex.set(key, i);
    monthBuckets.push({
      label: MONTH_LABELS[cursor.getMonth()],
      tenders: 0,
      bids: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const row of tenderActivityRows) {
    const d = new Date(row.createdAt);
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) monthBuckets[idx].tenders += 1;
  }
  for (const row of bidActivityRows) {
    const d = new Date(row.createdAt);
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) monthBuckets[idx].bids += 1;
  }

  const tenderStatusSlices: AnalyticsSlice[] = (
    [
      ["DRAFT", "Սևագիր", "#94a3b8"],
      ["REVIEW", "Դիտարկում", "#f59e0b"],
      ["ACTIVE", "Ակտիվ", "#10b981"],
      ["AWARDED", "Հանձնված", "#0ea5e9"],
      ["COMPLETED", "Ավարտված", "#6366f1"],
      ["CANCELLED", "Չեղարկված", "#f43f5e"],
      ["EXPIRED_UNAWARDED", "Ժամկ. անցած", "#a8a29e"],
    ] as Array<[TenderStatus, string, string]>
  )
    .map(([key, label, color]) => ({
      label,
      value: tenderByStatus.get(key) ?? 0,
      color,
    }))
    .filter((s) => s.value > 0);

  const bidStatusSlices: AnalyticsSlice[] = (
    [
      ["ACCEPTED", "Ընդունված", "#10b981"],
      ["SHORTLISTED", "Կարճ ցուցակ", "#0ea5e9"],
      ["PENDING", "Սպասման մեջ", "#f59e0b"],
      ["REJECTED", "Մերժված", "#f43f5e"],
      ["WITHDRAWN", "Հետ կանչված", "#94a3b8"],
    ] as Array<[string, string, string]>
  )
    .map(([key, label, color]) => ({
      label,
      value: bidsByStatus.get(key as never) ?? 0,
      color,
    }))
    .filter((s) => s.value > 0);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-slate-950">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 5%, rgba(251,191,36,0.16), transparent 38%), radial-gradient(circle at 85% 0%, rgba(15,23,42,0.06), transparent 32%)",
        }}
      />

      <SiteHeader />

      <main className="px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-4xl bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80">
            <div className="relative h-32 overflow-hidden sm:h-40" aria-hidden>
              <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800" />
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-amber-400/20 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-amber-500/10 blur-2xl" />
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "26px 26px",
                }}
              />
               <div className="absolute top-4 right-4">
                <Link
                    href={ROUTES.userProfile(user.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
               </div>
            </div>

            <div className="relative px-5 pb-6 sm:px-8 sm:pb-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="-mt-16 shrink-0 sm:-mt-20">
                    <div className="relative">
                      <div className="size-28 overflow-hidden rounded-3xl bg-slate-100 shadow-xl ring-4 ring-white sm:size-32">
                        {user.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.image}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center bg-linear-to-br from-amber-100 to-amber-50 text-4xl font-black text-amber-800">
                            {initialsFromName(displayName)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={ROUTES.accountSettings}
                        aria-label="Փոխել նկարը"
                        className="absolute -bottom-1.5 -right-1.5 grid size-9 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg ring-2 ring-white transition hover:bg-slate-800"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <AccountTypeBadge accountType={accountType} size="md" />
                      {isFullyVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200">
                          <BadgeCheck className="size-3.5" />
                          Վերիֆիկացված
                        </span>
                      ) : (
                        <Link
                          href={ROUTES.accountVerification}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                        >
                          <AlertTriangle className="size-3.5" />
                          Անավարտ վերիֆիկացիա
                        </Link>
                      )}
                      {isTelegramLinked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-800 ring-1 ring-sky-200">
                          <ShieldCheck className="size-3.5" />
                          Telegram
                        </span>
                      ) : null}
                    </div>

                    <h1 className="mt-2.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem]">
                      {displayName}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-slate-400" />
                        {user.email}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-slate-400" />
                        {user.phone ?? "Հեռախոս չկա"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-slate-400" />
                        {formatDateTime(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2 flex-col justify-end">
                  <div className="flex flex-wrap items-center gap-2">
                      <Link
                      href={ROUTES.createTender}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-300"
                    >
                      <Plus className="size-4" />
                      Տեղադրել մրցույթ
                    </Link>
                  </div>
                
                   
                  <Link
                    href={ROUTES.accountSettings}
                    aria-label="Կարգավորումներ"
                    className="inline-flex items-center justify-center w-[179px] gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <Settings className="size-4" />
                    <span className="hidden sm:inline">Կարգավորումներ</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* STAT CARDS */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={WalletCards}
              label="Դրամապանակ"
              value={formatAmd(walletBalance)}
              hint="Հասանելի մնացորդ"
              accent
            />
            <StatCard
              icon={BriefcaseBusiness}
              label="Իմ մրցույթներ"
              value={String(tenderCount)}
              hint={`${activeTenderCount} ակտիվ / դիտարկման փուլում`}
            />
            <StatCard
              icon={Send}
              label="Իմ առաջարկներ"
              value={String(bidCount)}
              hint={`${wonBidCount} հաղթած մրցույթ`}
            />
            <StatCard
              icon={Clock3}
              label="Բաժանորդագրություն"
              value={String(remainingBids)}
              hint={
                activeSubscription
                  ? `Մնացորդ՝ մինչև ${new Date(activeSubscription.endsAt).toLocaleDateString("hy-AM")}`
                  : "Ակտիվ փաթեթ չկա"
              }
            />
          </section>

          {/* ANALYTICS */}
          <AccountAnalytics
            monthly={monthBuckets}
            tenderStatus={tenderStatusSlices}
            bidStatus={bidStatusSlices}
            successRate={successRate}
            bidCount={bidCount}
            wonBidCount={wonBidCount}
            avgRating={avgRating}
            ratingCount={ratingAgg._count._all}
            likesCount={likesCount}
            pendingReviews={pendingReviewsReceivedCount}
          />

          {/* MY TENDERS + TRANSACTIONS */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
                    <BriefcaseBusiness className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      Իմ մրցույթները
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Վերջին թարմացվածները
                    </p>
                  </div>
                </div>
                <Link
                  href={ROUTES.myTenders}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-slate-200 transition hover:bg-white hover:text-amber-950"
                >
                  Բոլորը
                  <ChevronRight className="size-4" />
                </Link>
              </div>

              {myTendersPreview.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
                  <BriefcaseBusiness className="mx-auto size-9 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-800">
                    Դեռ մրցույթ չեք տեղադրել
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Ստեղծեք առաջին հայտարարությունը։
                  </p>
                  <Link
                    href={ROUTES.createTender}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <Plus className="size-4" />
                    Տեղադրել մրցույթ
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {myTendersPreview.map((tender) => {
                    const budgetText =
                      tender.budgetMin || tender.budgetMax
                        ? `${formatAmd(Number(tender.budgetMin ?? 0))} – ${formatAmd(
                            Number(tender.budgetMax ?? tender.budgetMin ?? 0),
                          )}`
                        : "—";
                    const thumb = tender.images[0]?.url ?? null;
                    const canEditTender =
                      tender.status === "DRAFT" ||
                      tender.status === "REVIEW" ||
                      (tender.status === "ACTIVE" && tender._count.bids === 0);

                    return (
                      <li key={tender.id}>
                        <div className="flex flex-col gap-3 rounded-3xl bg-slate-50/80 p-3 ring-1 ring-slate-200/80 transition hover:bg-white hover:shadow-md hover:ring-slate-300 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                          <Link
                            href={ROUTES.tenderDetail(tender.id)}
                            className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
                          >
                            {thumb ? (
                              <div className="shrink-0 overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:size-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={thumb}
                                  alt=""
                                  className="aspect-4/3 size-full max-h-36 object-cover sm:aspect-square sm:max-h-none"
                                />
                              </div>
                            ) : (
                              <div className="hidden size-20 shrink-0 place-items-center rounded-2xl bg-white text-slate-300 ring-1 ring-slate-200 sm:grid">
                                <BriefcaseBusiness className="size-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${TENDER_STATUS_BADGE[tender.status]}`}
                                >
                                  {TENDER_STATUS_LABEL[tender.status]}
                                </span>
                                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                                  {tender.category}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-base font-black text-slate-900">
                                {tender.title}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                {tender.city ? (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3 shrink-0" />
                                    {tender.city}
                                  </span>
                                ) : null}
                                <span>{tender._count.bids} առաջարկ</span>
                                <span>
                                  {formatDateTime(tender.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </Link>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                            <div className="rounded-2xl bg-white px-3 py-2 text-right ring-1 ring-slate-200/80">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                Բյուջե
                              </p>
                              <p className="text-sm font-black text-slate-900">
                                {budgetText}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {canEditTender ? (
                                <Link
                                  href={ROUTES.editTender(tender.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-800"
                                >
                                  <Pencil className="size-3.5 shrink-0" aria-hidden />
                                  Խմբագրել
                                </Link>
                              ) : null}
                              <Link
                                href={ROUTES.tenderDetail(tender.id)}
                                className="inline-flex items-center gap-0.5 text-xs font-black text-amber-800 transition hover:text-amber-950"
                              >
                                Բացել
                                <ChevronRight className="size-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
                  <CreditCard className="size-4" />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Վերջին գործարքներ
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    Դրամապանակի շարժ
                  </p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
                  <CreditCard className="mx-auto size-8 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-700">
                    Գործարք դեռ չկա
                  </p>
                </div>
              ) : (
                <ul className="mt-5 space-y-2.5">
                  {transactions.map((transaction) => {
                    const isCredit = CREDIT_TYPES.has(transaction.type);
                    const amount = Number(transaction.amount);
                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-200/80"
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                            isCredit
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {transaction.description ||
                              TRANSACTION_LABEL[transaction.type]}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {formatDateTime(transaction.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-black tabular-nums ${
                              isCredit ? "text-emerald-700" : "text-slate-900"
                            }`}
                          >
                            {isCredit ? "+" : "−"}
                            {formatAmd(Math.abs(amount))}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {transaction.status}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-4xl p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
        accent
          ? "bg-linear-to-br from-slate-950 to-slate-800 text-white ring-slate-800"
          : "bg-white text-slate-950 ring-slate-200/80"
      }`}
    >
      {accent ? (
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-amber-400/20 blur-2xl"
          aria-hidden
        />
      ) : null}
      <div
        className={`relative grid size-11 place-items-center rounded-2xl ${
          accent
            ? "bg-white/10 text-amber-300 ring-1 ring-white/15"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <p
        className={`relative mt-4 text-xs font-black uppercase tracking-[0.14em] ${
          accent ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className="relative mt-1 text-3xl font-black tracking-tight">{value}</p>
      <p
        className={`relative mt-1 text-xs font-semibold ${
          accent ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {hint}
      </p>
    </article>
  );
}
