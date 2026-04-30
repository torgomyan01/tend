import { Gavel } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { prisma } from "@/lib/prisma";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Սպասում է",
  SHORTLISTED: "Կարճ ցանկում",
  ACCEPTED: "Հաստատված",
  REJECTED: "Մերժված",
  WITHDRAWN: "Հետ վերցված",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SHORTLISTED: "bg-indigo-100 text-indigo-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};

export default async function AdminBidsPage() {
  const [bids, total, accepted] = await Promise.all([
    prisma.bid.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
        tender: {
          select: { id: true, title: true, category: true },
        },
      },
    }),
    prisma.bid.count(),
    prisma.bid.count({ where: { status: "ACCEPTED" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Առաջարկներ"
        description="Մասնագետների ուղարկած առաջարկները մրցույթներին։"
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ընդհանուր
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(total)}</p>
        </article>
        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Հաստատված
          </p>
          <p className="mt-2 text-3xl font-black">{formatNumber(accepted)}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Մասնագետ</th>
              <th className="px-4 py-3">Մրցույթ</th>
              <th className="px-4 py-3">Գումար</th>
              <th className="hidden px-4 py-3 sm:table-cell">Կարգավիճակ</th>
              <th className="hidden px-4 py-3 md:table-cell">Ամսաթիվ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bids.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  <Gavel className="mx-auto mb-2 size-8 text-slate-300" />
                  Առաջարկներ չեն գտնվել։
                </td>
              </tr>
            ) : (
              bids.map((bid) => (
                <tr key={bid.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      {bid.provider.name || bid.provider.email}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {bid.provider.phone ?? bid.provider.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="line-clamp-1 text-sm font-bold text-slate-800">
                      {bid.tender.title}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {bid.tender.category}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-slate-900">
                    {formatAmd(Number(bid.price))}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[bid.status]}`}
                    >
                      {STATUS_LABEL[bid.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs font-semibold text-slate-500 md:table-cell">
                    {formatDateTime(bid.createdAt)}
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
