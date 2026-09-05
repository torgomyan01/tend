import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { WalletDepositPanel } from "@/components/wallet-deposit-panel";
import type { TransactionType } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { formatAmd, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Դրամապանակ | Tend.am",
};

const TRANSACTION_LABEL: Record<TransactionType, string> = {
  DEPOSIT: "Համալրում",
  BID_FEE: "Մասնակցության վճար",
  SUBSCRIPTION: "Բաժանորդագրություն",
  REFUND: "Վերադարձ",
  ADJUSTMENT: "Ճշգրտում",
  PROFILE_CONTACT_UNLOCK: "Կոնտակտների բացում",
};

const CREDIT_TYPES = new Set<TransactionType>(["DEPOSIT", "REFUND"]);

export default async function AccountWalletPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.accountWallet)}`,
    );
  }

  const userId = session.user.id;

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    redirect(ROUTES.login);
  }

  const balance = Number(user.walletBalance);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff7ed_0%,_#f8fafc_45%,_#f1f5f9_100%)] text-slate-950">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <Link
          href={ROUTES.account}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Իմ հաշիվ
        </Link>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-950/20 ring-1 ring-slate-700/50 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
              <Wallet className="size-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300/90">
                Իմ դրամապանակը
              </p>
              <p className="mt-1 truncate text-4xl font-black tabular-nums tracking-tight">
                {formatAmd(balance)}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                Լիցքավորեք հաշիվը մրցույթներին մասնակցելու համար
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
          <h1 className="text-lg font-black tracking-tight text-slate-950">
            Հաշվի համալրում
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Վճարումը կատարվում է անվտանգ բանկային էջում։
          </p>
          <div className="mt-5">
            <WalletDepositPanel />
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
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
      </main>
    </div>
  );
}
