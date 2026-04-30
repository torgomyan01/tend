import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  CreditCard,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountSignOut } from "@/components/account-sign-out";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

function formatAmd(value: number) {
  return `${new Intl.NumberFormat("hy-AM", {
    maximumFractionDigits: 0,
  }).format(value)} ֏`;
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const userId = session.user.id;
  const [
    user,
    tenderCount,
    activeTenderCount,
    bidCount,
    wonBidCount,
    transactions,
    latestVerificationRequest,
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
    ]);

  if (!user) {
    redirect(ROUTES.login);
  }

  const activeSubscription = user.subscriptions[0] ?? null;
  const remainingBids = activeSubscription
    ? Math.max(activeSubscription.monthlyBidLimit - activeSubscription.usedBidCount, 0)
    : 0;
  const walletBalance = Number(user.walletBalance);
  const isFullyVerified = latestVerificationRequest?.status === "APPROVED";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                  Իմ հաշիվ
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {user.name || "Tend.am օգտատեր"}
                  </h1>
                  <div className="group relative inline-flex pb-2">
                    <Link
                      href={ROUTES.accountVerification}
                      className="inline-flex"
                      aria-label={
                        isFullyVerified
                          ? "Հաշիվը վերիֆիկացված է"
                          : "Անցեք հաշվի վերիֆիկացիա"
                      }
                    >
                      {isFullyVerified ? (
                        <BadgeCheck className="size-6 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="size-6 fill-amber-300 text-amber-700" />
                      )}
                    </Link>
                    <div className="absolute left-1/2 top-full z-20 hidden w-72 -translate-x-1/2 rounded-2xl bg-slate-950 px-3 py-3 text-center text-xs font-bold text-white shadow-xl group-hover:block group-focus-within:block">
                      <p>
                        {isFullyVerified
                          ? "Հաշիվը վերիֆիկացված է։"
                          : "Ավելի տեսանելի և մեծ ֆունկցիոնալություն ունենալու համար խնդրում ենք անցեք հաշվի վերիֆիկացիա։"}
                      </p>
                      {!isFullyVerified ? (
                        <Link
                          href={ROUTES.accountVerification}
                          className="mt-3 inline-flex rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-300"
                        >
                          Անցնել վերիֆիկացիա
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
                  <p>{user.email}</p>
                  <p>{user.phone ?? "Հեռախոսահամարը բացակայում է"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={ROUTES.createTender}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  Տեղադրել մրցույթ
                </Link>
                <AccountSignOut />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <WalletCards className="size-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-500">Դրամապանակ</p>
              <p className="mt-1 text-3xl font-black">{formatAmd(walletBalance)}</p>
            </article>

            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <BriefcaseBusiness className="size-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-500">Իմ մրցույթներ</p>
              <p className="mt-1 text-3xl font-black">{tenderCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {activeTenderCount} ակտիվ կամ դիտարկման փուլում
              </p>
            </article>

            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <CreditCard className="size-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-500">Իմ առաջարկներ</p>
              <p className="mt-1 text-3xl font-black">{bidCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {wonBidCount} հաղթած մրցույթ
              </p>
            </article>

            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <Clock3 className="size-5" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-500">Subscription</p>
              <p className="mt-1 text-3xl font-black">{remainingBids}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {activeSubscription
                  ? `Մնացորդ (${new Date(activeSubscription.endsAt).toLocaleDateString("hy-AM")})`
                  : "Ակտիվ փաթեթ չկա"}
              </p>
            </article>
          </section>

          <section>
            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-xl font-black">Վերջին գործարքներ</h2>
              {transactions.length === 0 ? (
                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Գործարք դեռ չկա։
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {transaction.description || transaction.type}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {new Date(transaction.createdAt).toLocaleString("hy-AM")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">
                          {formatAmd(Number(transaction.amount))}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
