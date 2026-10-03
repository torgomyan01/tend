import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminDisputesPanel,
  type AdminDisputeRow,
} from "@/components/admin/admin-disputes-panel";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import type { Prisma, TenderEscrowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "OPEN", label: "Բաց վեճեր" },
  { value: "RESOLVED", label: "Լուծված" },
  { value: "ALL", label: "Բոլորը" },
];

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter =
    FILTERS.some((f) => f.value === params.status) && params.status
      ? params.status
      : "OPEN";

  let where: Prisma.TenderEscrowWhereInput;
  if (statusFilter === "OPEN") {
    where = { status: "DISPUTED" };
  } else if (statusFilter === "RESOLVED") {
    where = {
      disputedAt: { not: null },
      status: { in: ["RELEASED", "REFUNDED"] as TenderEscrowStatus[] },
    };
  } else {
    where = {
      OR: [
        { status: "DISPUTED" },
        {
          disputedAt: { not: null },
          status: { in: ["RELEASED", "REFUNDED"] as TenderEscrowStatus[] },
        },
      ],
    };
  }

  const [rowsRaw, openCount, resolvedCount] = await Promise.all([
    prisma.tenderEscrow.findMany({
      where,
      orderBy: [{ disputedAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
      include: {
        tender: { select: { id: true, title: true } },
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
        contract: {
          select: {
            id: true,
            conversation: { select: { id: true } },
          },
        },
      },
    }),
    prisma.tenderEscrow.count({ where: { status: "DISPUTED" } }),
    prisma.tenderEscrow.count({
      where: {
        disputedAt: { not: null },
        status: { in: ["RELEASED", "REFUNDED"] },
      },
    }),
  ]);

  const rows: AdminDisputeRow[] = rowsRaw.map((e) => ({
    id: e.id,
    status: e.status,
    paymentCode: e.paymentCode,
    contractAmount: Number(e.contractAmount),
    platformFeePercent: Number(e.platformFeePercent),
    platformFeeAmount: Number(e.platformFeeAmount),
    providerReceives: Number(e.providerReceives),
    currency: e.currency,
    clientNote: e.clientNote,
    disputeReason: e.disputeReason,
    adminNote: e.adminNote,
    fundedAt: e.fundedAt?.toISOString() ?? null,
    disputedAt: e.disputedAt?.toISOString() ?? null,
    releasedAt: e.releasedAt?.toISOString() ?? null,
    refundedAt: e.refundedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    contractId: e.contractId,
    conversationId: e.contract.conversation?.id ?? null,
    tender: e.tender,
    client: e.client,
    provider: e.provider,
  }));

  return (
    <>
      <AdminPageHeader
        eyebrow="Ֆինանսներ"
        title="Escrow վեճեր"
        description="Բացված վեճերի քննություն և լուծում՝ պատվիրատուի կամ կատարողի օգտին։"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
            Բաց վեճեր
          </p>
          <p className="mt-1 text-2xl font-black text-rose-950">
            {formatNumber(openCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
            Լուծված
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-950">
            {formatNumber(resolvedCount)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "OPEN"
                  ? ROUTES.admin.disputes
                  : `${ROUTES.admin.disputes}?status=${filter.value}`
              }
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
        <Link
          href={ROUTES.admin.escrows}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Բոլոր escrow-ները
        </Link>
      </div>

      <AdminDisputesPanel rows={rows} />
    </>
  );
}
