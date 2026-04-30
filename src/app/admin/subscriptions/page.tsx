import { Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ակտիվ",
  EXPIRED: "Ավարտված",
  CANCELLED: "Չեղարկված",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default async function AdminSubscriptionsPage() {
  const [subscriptions, activeCount, expiredCount] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "EXPIRED" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Ֆինանսներ"
        title="Բաժանորդագրություններ"
        description="Մասնագետների ակտիվ ու ավարտված փաթեթները։"
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ակտիվ
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(activeCount)}</p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ավարտված
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(expiredCount)}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Օգտատեր</th>
              <th className="px-4 py-3">Կարգավիճակ</th>
              <th className="px-4 py-3">Օգտագործում</th>
              <th className="hidden px-4 py-3 md:table-cell">Ժամկետ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {subscriptions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  <Sparkles className="mx-auto mb-2 size-8 text-slate-300" />
                  Բաժանորդագրություններ չկան։
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      {subscription.user.name || subscription.user.email}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {subscription.user.phone ?? subscription.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[subscription.status]}`}
                    >
                      {STATUS_LABEL[subscription.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">
                    {subscription.usedBidCount} / {subscription.monthlyBidLimit}
                    <p className="text-[11px] font-semibold text-slate-500">
                      ամսական լիմիտից
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs font-semibold text-slate-500 md:table-cell">
                    {formatDate(subscription.startsAt)} → {formatDate(subscription.endsAt)}
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
