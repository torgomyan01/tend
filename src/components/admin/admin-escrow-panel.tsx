"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ESCROW_STATUS_LABEL } from "@/lib/escrow";
import { formatAmd, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";
import type { TenderEscrowStatus } from "@/generated/prisma/client";

export type AdminEscrowRow = {
  id: string;
  status: TenderEscrowStatus;
  paymentCode: string;
  contractAmount: number;
  platformFeeAmount: number;
  providerReceives: number;
  clientNote: string | null;
  disputeReason: string | null;
  createdAt: string;
  tender: { id: string; title: string };
  contractId: string;
  client: { id: string; name: string | null; email: string };
  provider: { id: string; name: string | null; email: string };
};

type Props = {
  rows: AdminEscrowRow[];
};

type Action = "CONFIRM_FUNDING" | "CONFIRM_RELEASE" | "REFUND" | "CANCEL";

export function AdminEscrowPanel({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, action: Action) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/escrows/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        toastError("Չհաջողվեց", "Ստուգեք կարգավիճակը և փորձեք նորից։");
        return;
      }
      toastSuccess("Թարմացված է", "Escrow կարգավիճակը փոխված է։");
      router.refresh();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-3xl bg-white p-8 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
        Այս ֆիլտրով escrow չկա։
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const busy = busyId === row.id;
        const clientLabel = row.client.name?.trim() || row.client.email;
        const providerLabel = row.provider.name?.trim() || row.provider.email;
        return (
          <li
            key={row.id}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  {ESCROW_STATUS_LABEL[row.status] ?? row.status}
                </p>
                <h3 className="mt-1 text-base font-black text-slate-950">
                  {row.tender.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {formatDateTime(row.createdAt)} · կոդ՝{" "}
                  <span className="font-mono text-emerald-800">
                    {row.paymentCode}
                  </span>
                </p>
              </div>
              <div className="text-right text-sm font-black text-slate-900">
                <p>{formatAmd(row.contractAmount)}</p>
                <p className="text-xs font-semibold text-slate-500">
                  կատարող՝ {formatAmd(row.providerReceives)} · fee{" "}
                  {formatAmd(row.platformFeeAmount)}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Պատվիրատու</dt>
                <dd>{clientLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Կատարող</dt>
                <dd>{providerLabel}</dd>
              </div>
            </dl>

            {row.clientNote ? (
              <p className="mt-3 text-xs font-semibold text-slate-600">
                Նշում՝ {row.clientNote}
              </p>
            ) : null}
            {row.disputeReason ? (
              <p className="mt-2 text-xs font-bold text-rose-800">
                Վեճ՝ {row.disputeReason}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={ROUTES.contract(row.contractId)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800"
              >
                Պայմանագիր
              </a>
              <a
                href={ROUTES.tenderDetail(row.tender.id)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800"
              >
                Մրցույթ
              </a>

              {(row.status === "PAYMENT_SUBMITTED" ||
                row.status === "PENDING_FUNDING") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(row.id, "CONFIRM_FUNDING")}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Հաստատել մուտքը
                </button>
              )}

              {(row.status === "RELEASE_PENDING" ||
                row.status === "FUNDED" ||
                row.status === "DISPUTED") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(row.id, "CONFIRM_RELEASE")}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Փոխանցել կատարողին
                </button>
              )}

              {(row.status === "DISPUTED" ||
                row.status === "FUNDED" ||
                row.status === "PAYMENT_SUBMITTED" ||
                row.status === "RELEASE_PENDING") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(row.id, "REFUND")}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Վերադարձ պատվիրատուին
                </button>
              )}

              {(row.status === "AWAITING_CONTRACT" ||
                row.status === "PENDING_FUNDING" ||
                row.status === "PAYMENT_SUBMITTED") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(row.id, "CANCEL")}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Չեղարկել
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
