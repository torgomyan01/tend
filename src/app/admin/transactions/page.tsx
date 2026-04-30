import { CreditCard } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import type { Prisma, TransactionType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Համալրում",
  BID_FEE: "Առաջարկի վճար",
  SUBSCRIPTION: "Բաժանորդագրություն",
  REFUND: "Վերադարձ",
  ADJUSTMENT: "Ճշտում",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Սպասում է",
  SUCCEEDED: "Հաջող",
  FAILED: "Ձախողված",
  CANCELLED: "Չեղարկված",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SUCCEEDED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const TYPE_FILTERS = [
  { value: "ALL", label: "Բոլոր տեսակները" },
  { value: "DEPOSIT", label: "Համալրումներ" },
  { value: "BID_FEE", label: "Առաջարկի վճարներ" },
  { value: "SUBSCRIPTION", label: "Բաժանորդագրություններ" },
  { value: "REFUND", label: "Վերադարձներ" },
];

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const typeFilter =
    params.type && TYPE_LABEL[params.type] ? params.type : "ALL";

  const where: Prisma.TransactionWhereInput =
    typeFilter === "ALL" ? {} : { type: typeFilter as TransactionType };

  const [transactions, totalCount, succeededAmount, failedCount] =
    await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 80,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...where, status: "SUCCEEDED" },
      }),
      prisma.transaction.count({ where: { ...where, status: "FAILED" } }),
    ]);

  const succeededTotal = Number(succeededAmount?._sum?.amount ?? 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Ֆինանսներ"
        title="Գործարքներ"
        description="Համալրումների, առաջարկի վճարների ու բաժանորդագրությունների պատմություն։"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ընդհանուր գործարքներ
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(totalCount)}</p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Հաջող գումարը
          </p>
          <p className="mt-2 text-3xl font-black">
            {formatAmd(succeededTotal)}
          </p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ձախողված
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(failedCount)}</p>
        </article>
      </section>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => {
          const isActive = typeFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "ALL"
                  ? ROUTES.admin.transactions
                  : `${ROUTES.admin.transactions}?type=${filter.value}`
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

      <section className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Օգտատեր</th>
              <th className="px-4 py-3">Տեսակ</th>
              <th className="px-4 py-3">Գումար</th>
              <th className="hidden px-4 py-3 sm:table-cell">Կարգավիճակ</th>
              <th className="hidden px-4 py-3 lg:table-cell">Նկարագրություն</th>
              <th className="hidden px-4 py-3 md:table-cell">Ամսաթիվ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  <CreditCard className="mx-auto mb-2 size-8 text-slate-300" />
                  Գործարքներ չեն գտնվել։
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      {transaction.user.name || transaction.user.email}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {transaction.user.phone ?? transaction.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-slate-700">
                    {TYPE_LABEL[transaction.type]}
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-slate-900">
                    {formatAmd(Number(transaction.amount))}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[transaction.status]}`}
                    >
                      {STATUS_LABEL[transaction.status]}
                    </span>
                  </td>
                  <td className="hidden max-w-xs px-4 py-3 text-xs font-semibold text-slate-500 lg:table-cell">
                    <span className="line-clamp-2">
                      {transaction.description ?? "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs font-semibold text-slate-500 md:table-cell">
                    {formatDateTime(transaction.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
