import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CreditCard,
  Gavel,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL_HY: Record<string, string> = {
  PENDING: "Սպասում է",
  SUCCEEDED: "Հաստատված",
  FAILED: "Ձախողված",
  CANCELLED: "Չեղարկված",
  ACTIVE: "Ակտիվ",
  REVIEW: "Քննարկում",
  AWARDED: "Հանձնվել է",
  COMPLETED: "Ավարտված",
  DRAFT: "Սևագիր",
  APPROVED: "Հաստատված",
  REJECTED: "Մերժված",
};

function statusLabel(value: string) {
  return STATUS_LABEL_HY[value] ?? value;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    blockedUsers,
    totalTenders,
    activeTenders,
    totalBids,
    pendingVerifications,
    totalSubscriptions,
    successDeposits,
    walletAggregate,
    recentVerifications,
    recentTenders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.tender.count(),
    prisma.tender.count({ where: { status: { in: ["ACTIVE", "REVIEW"] } } }),
    prisma.bid.count(),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED", type: "DEPOSIT" },
    }),
    prisma.user.aggregate({
      _sum: { walletBalance: true },
    }),
    prisma.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    }),
    prisma.tender.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        createdAt: true,
        client: { select: { name: true, email: true } },
      },
    }),
  ]);

  const stats = [
    {
      label: "Օգտատերեր",
      value: formatNumber(totalUsers),
      hint: `+${formatNumber(newUsers7d)} վերջին 7 օրում`,
      icon: Users,
      tone: "amber",
    },
    {
      label: "Մրցույթներ",
      value: formatNumber(totalTenders),
      hint: `${formatNumber(activeTenders)} ակտիվ կամ քննարկման փուլում`,
      icon: BriefcaseBusiness,
      tone: "emerald",
    },
    {
      label: "Առաջարկներ",
      value: formatNumber(totalBids),
      hint: "Մասնագետների ընդհանուր ակտիվություն",
      icon: Gavel,
      tone: "indigo",
    },
    {
      label: "Հաստատման հայտեր",
      value: formatNumber(pendingVerifications),
      hint: "Սպասում են մոդերացիայի",
      icon: BadgeCheck,
      tone: "rose",
    },
    {
      label: "Ընդհանուր մուտքեր",
      value: formatAmd(Number(successDeposits._sum.amount ?? 0)),
      hint: "Հաջող համալրումներ",
      icon: CreditCard,
      tone: "amber",
    },
    {
      label: "Դրամապանակների մնացորդ",
      value: formatAmd(Number(walletAggregate._sum.walletBalance ?? 0)),
      hint: "Բոլոր օգտատերերի մնացորդը",
      icon: Wallet,
      tone: "emerald",
    },
    {
      label: "Ակտիվ բաժանորդագրություններ",
      value: formatNumber(totalSubscriptions),
      hint: "Փաթեթներով օգտատերեր",
      icon: Sparkles,
      tone: "indigo",
    },
    {
      label: "Արգելափակված հաշիվներ",
      value: formatNumber(blockedUsers),
      hint: "Կարիք ունեն հետևման",
      icon: TrendingUp,
      tone: "rose",
    },
  ];

  const toneClasses: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    indigo: "bg-indigo-100 text-indigo-800",
    rose: "bg-rose-100 text-rose-800",
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Կառավարման վահանակ"
        title="Բարի վերադարձ, թիմ Tend.am"
        description="Հավաքագրված ցուցանիշներ ամբողջ հարթակից՝ արագ որոշումներ կայացնելու համար։"
        actions={
          <Link
            href={ROUTES.admin.verifications}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5"
          >
            <BadgeCheck className="size-4" />
            Մոդերացիայի հերթ
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div
                className={`grid size-11 place-items-center rounded-2xl ${toneClasses[stat.tone]}`}
              >
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-3xl font-black text-slate-950">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {stat.hint}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Հաստատման հերթ
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Վերջին հայտերն, որոնք սպասում են ձեր որոշմանը։
              </p>
            </div>
            <Link
              href={ROUTES.admin.verifications}
              className="inline-flex items-center gap-1 text-sm font-black text-amber-700 transition hover:text-amber-600"
            >
              Բոլորը <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentVerifications.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Հերթը դատարկ է։ Ապրեք։
              </p>
            ) : (
              recentVerifications.map((request) => (
                <Link
                  key={request.id}
                  href={`${ROUTES.admin.verifications}#${request.id}`}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {request.user.name || request.user.email}
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {request.user.phone || request.user.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    {formatDateTime(request.submittedAt)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Վերջին մրցույթներ
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Հենց նոր ստեղծված հայտարարություններ։
              </p>
            </div>
            <Link
              href={ROUTES.admin.tenders}
              className="inline-flex items-center gap-1 text-sm font-black text-amber-700 transition hover:text-amber-600"
            >
              Բոլորը <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentTenders.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Դեռ մրցույթ չկա։
              </p>
            ) : (
              recentTenders.map((tender) => (
                <div
                  key={tender.id}
                  className="rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                >
                  <p className="truncate text-sm font-black text-slate-900">
                    {tender.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                      {statusLabel(tender.status)}
                    </span>
                    <span>{tender.category}</span>
                    <span>·</span>
                    <span>{formatDateTime(tender.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}
