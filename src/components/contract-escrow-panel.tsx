"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ESCROW_STATUS_LABEL, type EscrowBankDetails } from "@/lib/escrow";
import { ESCROW_UI } from "@/lib/escrow-ui-copy";
import { formatAmd } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import type { TenderEscrowStatus } from "@/generated/prisma/client";

export type ContractEscrowView = {
  id: string;
  status: TenderEscrowStatus;
  paymentCode: string;
  contractAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerReceives: number;
  clientNote: string | null;
  disputeReason: string | null;
};

type Props = {
  contractId: string;
  escrow: ContractEscrowView;
  bank: EscrowBankDetails;
  isOwner: boolean;
  isProvider: boolean;
  contractAccepted: boolean;
};

export function ContractEscrowPanel({
  contractId,
  escrow,
  bank,
  isOwner,
  isProvider,
  contractAccepted,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  const statusLabel = ESCROW_STATUS_LABEL[escrow.status] ?? escrow.status;

  async function submitPayment() {
    setBusy("pay");
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/escrow/submit-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() || undefined }),
        },
      );
      if (!res.ok) {
        toastError(ESCROW_UI.toastFail, ESCROW_UI.toastRetry);
        return;
      }
      toastSuccess(ESCROW_UI.toastPaymentOk, ESCROW_UI.toastPaymentOkBody);
      router.refresh();
    } catch {
      toastError(ESCROW_UI.toastNetwork, ESCROW_UI.toastRetry);
    } finally {
      setBusy(null);
    }
  }

  async function requestRelease() {
    setBusy("release");
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/escrow/request-release`,
        { method: "POST" },
      );
      if (!res.ok) {
        toastError(ESCROW_UI.toastFail, ESCROW_UI.toastRetry);
        return;
      }
      toastSuccess(ESCROW_UI.toastReleaseOk, ESCROW_UI.toastReleaseOkBody);
      router.refresh();
    } catch {
      toastError(ESCROW_UI.toastNetwork, ESCROW_UI.toastRetry);
    } finally {
      setBusy(null);
    }
  }

  async function openDispute() {
    if (disputeReason.trim().length < 10) {
      toastError(ESCROW_UI.toastDisputeShort, ESCROW_UI.toastDisputeShortBody);
      return;
    }
    setBusy("dispute");
    try {
      const res = await fetch(`/api/contracts/${contractId}/escrow/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      if (!res.ok) {
        toastError(ESCROW_UI.toastFail, ESCROW_UI.toastRetry);
        return;
      }
      toastSuccess(ESCROW_UI.toastDisputeOk, ESCROW_UI.toastDisputeOkBody);
      setShowDispute(false);
      router.refresh();
    } catch {
      toastError(ESCROW_UI.toastNetwork, ESCROW_UI.toastRetry);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-200 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            {ESCROW_UI.badge}
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{statusLabel}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {ESCROW_UI.amountLine(
              formatAmd(escrow.contractAmount),
              formatAmd(escrow.providerReceives),
              escrow.platformFeePercent,
              formatAmd(escrow.platformFeeAmount),
            )}
          </p>
        </div>
      </div>

      {contractAccepted &&
      (escrow.status === "PENDING_FUNDING" ||
        escrow.status === "PAYMENT_SUBMITTED") ? (
        <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {ESCROW_UI.bankTitle}
          </p>
          <dl className="space-y-2 text-sm font-semibold text-slate-800">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-slate-500">{ESCROW_UI.receiver}</dt>
              <dd>{bank.receiverName}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-slate-500">{ESCROW_UI.bank}</dt>
              <dd>{bank.bankName}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-slate-500">{ESCROW_UI.account}</dt>
              <dd className="font-mono">{bank.accountNumber}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-slate-500">{ESCROW_UI.amount}</dt>
              <dd>{formatAmd(escrow.contractAmount)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-slate-500">{ESCROW_UI.paymentCode}</dt>
              <dd className="font-mono font-black text-emerald-800">
                {escrow.paymentCode}
              </dd>
            </div>
          </dl>
          {bank.hint ? (
            <p className="text-xs font-semibold text-slate-600">{bank.hint}</p>
          ) : null}
          {isOwner && escrow.status === "PENDING_FUNDING" ? (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-600">
                {ESCROW_UI.noteOptional}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                  placeholder={ESCROW_UI.notePlaceholder}
                  maxLength={500}
                />
              </label>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void submitPayment()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy === "pay" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {ESCROW_UI.submitPayment}
              </button>
            </div>
          ) : null}
          {escrow.status === "PAYMENT_SUBMITTED" ? (
            <p className="text-xs font-bold text-amber-800">
              {ESCROW_UI.paymentReview}
            </p>
          ) : null}
          {isProvider && escrow.status === "PENDING_FUNDING" ? (
            <p className="text-xs font-bold text-slate-600">
              {ESCROW_UI.waitTransfer}
            </p>
          ) : null}
        </div>
      ) : null}

      {escrow.status === "FUNDED" ? (
        <div className="mt-5 space-y-3">
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
            {ESCROW_UI.funded}
          </p>
          {isOwner ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void requestRelease()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "release" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {ESCROW_UI.releaseCta}
            </button>
          ) : null}
        </div>
      ) : null}

      {escrow.status === "RELEASE_PENDING" ? (
        <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
          {ESCROW_UI.releasePending}
        </p>
      ) : null}

      {escrow.status === "DISPUTED" ? (
        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 ring-1 ring-rose-200">
          <p>{ESCROW_UI.disputed}</p>
          {escrow.disputeReason ? (
            <p className="mt-2 font-semibold">{escrow.disputeReason}</p>
          ) : null}
        </div>
      ) : null}

      {(escrow.status === "FUNDED" || escrow.status === "RELEASE_PENDING") &&
      (isOwner || isProvider) ? (
        <div className="mt-4">
          {!showDispute ? (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="text-xs font-bold text-rose-700 underline-offset-2 hover:underline"
            >
              {ESCROW_UI.openDispute}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold"
                placeholder={ESCROW_UI.disputePlaceholder}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void openDispute()}
                  className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {busy === "dispute" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    ESCROW_UI.submit
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDispute(false)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                >
                  {ESCROW_UI.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!contractAccepted && escrow.status === "AWAITING_CONTRACT" ? (
        <p className="mt-4 text-xs font-semibold text-slate-600">
          {ESCROW_UI.awaitingContract}
        </p>
      ) : null}
    </section>
  );
}
