import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEscrowPanel,
  type AdminEscrowRow,
} from "@/components/admin/admin-escrow-panel";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import type { Prisma, TenderEscrowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "ACTION", label: "Գործողություն պահանջող" },
  { value: "ALL", label: "Բոլորը" },
  { value: "PAYMENT_SUBMITTED", label: "Ստուգել մուտքը" },
  { value: "RELEASE_PENDING", label: "Payout" },
  { value: "DISPUTED", label: "Վեջեր" },
  { value: "FUNDED", label: "Պահված" },
  { value: "PENDING_FUNDING", label: "Սպասում փոխանցմանը" },
];

const ACTION_STATUSES: TenderEscrowStatus[] = [
  "PAYMENT_SUBMITTED",
  "RELEASE_PENDING",
  "DISPUTED",
];

export default async function AdminEscrowsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter =
    FILTERS.some((f) => f.value === params.status) && params.status
      ? params.status
      : "ACTION";

  const where: Prisma.TenderEscrowWhereInput =
    statusFilter === "ALL"
      ? {}
      : statusFilter === "ACTION"
        ? { status: { in: ACTION_STATUSES } }
        : { status: statusFilter as TenderEscrowStatus };

  const escrows = await prisma.tenderEscrow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      tender: { select: { id: true, title: true } },
      client: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, name: true, email: true } },
    },
  });

  const rows: AdminEscrowRow[] = escrows.map((e) => ({
    id: e.id,
    status: e.status,
    paymentCode: e.paymentCode,
    contractAmount: Number(e.contractAmount),
    platformFeeAmount: Number(e.platformFeeAmount),
    providerReceives: Number(e.providerReceives),
    clientNote: e.clientNote,
    disputeReason: e.disputeReason,
    createdAt: e.createdAt.toISOString(),
    tender: e.tender,
    contractId: e.contractId,
    client: e.client,
    provider: e.provider,
  }));

  return (
    <>
      <AdminPageHeader
        eyebrow="Ֆինանսներ"
        title="Պաշտպանված գործարքներ"
        description="Բանկային escrow · մուտքի հաստատում, payout և վեճեր։"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "ACTION"
                  ? ROUTES.admin.escrows
                  : `${ROUTES.admin.escrows}?status=${filter.value}`
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
      </div>

      <AdminEscrowPanel rows={rows} />
    </>
  );
}
