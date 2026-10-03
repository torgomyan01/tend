"use client";

import { ExternalLink, Loader2, MessageSquare, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ESCROW_STATUS_LABEL } from "@/lib/escrow";
import { formatAmd, formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";
import type { TenderEscrowStatus } from "@/generated/prisma/client";

export type AdminDisputeRow = {
  id: string;
  status: TenderEscrowStatus;
  paymentCode: string;
  contractAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerReceives: number;
  currency: string;
  clientNote: string | null;
  disputeReason: string | null;
  adminNote: string | null;
  fundedAt: string | null;
  disputedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  contractId: string;
  conversationId: string | null;
  tender: { id: string; title: string };
  client: { id: string; name: string | null; email: string; phone: string | null };
  provider: { id: string; name: string | null; email: string; phone: string | null };
};

type Props = { rows: AdminDisputeRow[] };
type Action = "SAVE_NOTE" | "RELEASE_TO_PROVIDER" | "REFUND_TO_CLIENT";

export function AdminDisputesPanel({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.adminNote ?? ""])),
  );
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  async function run(id: string, action: Action) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNote: notes[id]?.trim() || undefined,
          resolutionNote: resolutions[id]?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toastError("Չհաջողվեց", "Ստուգեք կարգավիճակը և փորձեք նորից։");
        return;
      }
      const labels: Record<Action, string> = {
        SAVE_NOTE: "Նշումը պահված է",
        RELEASE_TO_PROVIDER: "Վեճը լուծված է · գումարը կատարողին",
        REFUND_TO_CLIENT: "Վեճը լուծված է · վերադարձ պատվիրատուին",
      };
      toastSuccess(labels[action], "Կողմերը կծանուցվեն։");
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
        Այս ֆիլտրով վեճ չկա։
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {rows.map((row) => {
        const busy = busyId === row.id;
        const open = row.status === "DISPUTED";
        const clientLabel = row.client.name?.trim() || row.client.email;
        const providerLabel = row.provider.name?.trim() || row.provider.email;

        return (
          <li
            key={row.id}
            className={`rounded-3xl bg-white p-5 shadow-sm sm:p-6 ${
              open ? "ring-2 ring-rose-300" : "ring-1 ring-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                  open ? "text-rose-700" : "text-slate-500"
                }`}>
                  <Scale className="size-3.5" />
                  {ESCROW_STATUS_LABEL[row.status] ?? row.status}
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {row.tender.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Կոդ՝{" "}
                  <span className="font-mono font-black text-emerald-800">
                    {row.paymentCode}
                  </span>
                  {row.disputedAt
                    ? ` · վեճ՝ ${formatDateTime(row.disputedAt)}`
                    : null}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-950">
                  {formatAmd(row.contractAmount)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  կատարող՝ {formatAmd(row.providerReceives)} · fee{" "}
                  {row.platformFeePercent}% ({formatAmd(row.platformFeeAmount)})
                </p>
              </div>
            </div>

            {row.disputeReason ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
                  Վեճի պատճառ
                </p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-rose-950">
                  {row.disputeReason}
                </p>
              </div>
            ) : null}

            <dl className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Պատվիրատու
                </dt>
                <dd className="mt-1">
                  <Link
                    href={ROUTES.userProfile(row.client.id)}
                    className="font-black text-slate-950 underline-offset-2 hover:underline"
                  >
                    {clientLabel}
                  </Link>
                </dd>
                <dd className="mt-0.5 text-xs text-slate-500">{row.client.email}</dd>
                {row.client.phone ? (
                  <dd className="text-xs text-slate-500">{row.client.phone}</dd>
                ) : null}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Կատարող
                </dt>
                <dd className="mt-1">
                  <Link
                    href={ROUTES.userProfile(row.provider.id)}
                    className="font-black text-slate-950 underline-offset-2 hover:underline"
                  >
                    {providerLabel}
                  </Link>
                </dd>
                <dd className="mt-0.5 text-xs text-slate-500">{row.provider.email}</dd>
                {row.provider.phone ? (
                  <dd className="text-xs text-slate-500">{row.provider.phone}</dd>
                ) : null}
              </div>
            </dl>

            <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p>Ստեղծված՝ {formatDateTime(row.createdAt)}</p>
              <p>Պահված՝ {row.fundedAt ? formatDateTime(row.fundedAt) : "—"}</p>
              <p>Վեճ՝ {row.disputedAt ? formatDateTime(row.disputedAt) : "—"}</p>
              <p>
                Ավարտ՝{" "}
                {row.releasedAt
                  ? formatDateTime(row.releasedAt)
                  : row.refundedAt
                    ? formatDateTime(row.refundedAt)
                    : "—"}
              </p>
            </div>

            {row.clientNote ? (
              <p className="mt-3 text-xs font-semibold text-slate-600">
                Պատվիրատուի վճարման նշում՝ {row.clientNote}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={ROUTES.contract(row.contractId)}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800"
              >
                Պայմանագիր <ExternalLink className="size-3.5" />
              </a>
              <a
                href={ROUTES.tenderDetail(row.tender.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800"
              >
                Մրցույթ <ExternalLink className="size-3.5" />
              </a>
              {row.conversationId ? (
                <a
                  href={ROUTES.messageThread(row.conversationId)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-black text-white"
                >
                  <MessageSquare className="size-3.5" /> Մասնակցել զրույցին
                </a>
              ) : null}
            </div>

            {open ? (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <label className="block text-xs font-bold text-slate-600">
                  Ադմինի ներքին նշում
                  <textarea
                    value={notes[row.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    rows={2}
                    maxLength={2000}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                    placeholder="Ներքին նշումներ վեճի քննության համար…"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Որոշման տեքստ (կգնա կողմերին)
                  <textarea
                    value={resolutions[row.id] ?? ""}
                    onChange={(e) =>
                      setResolutions((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={2000}
                    className="mt-1.5 w-full rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2 text-sm font-semibold text-slate-800"
                    placeholder="Resolution note for both parties..."
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(row.id, "SAVE_NOTE")}
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Պահել նշումը
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(row.id, "RELEASE_TO_PROVIDER")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Լուծել · գումարը կատարողին
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(row.id, "REFUND_TO_CLIENT")}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Լուծել · վերադարձ պատվիրատուին
                  </button>
                </div>
              </div>
            ) : row.adminNote ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Ադմինի նշում՝ {row.adminNote}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
