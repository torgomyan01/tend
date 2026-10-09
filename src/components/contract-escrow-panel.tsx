"use client";

import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EscrowBankDetails } from "@/lib/escrow";
import {
  ESCROW_PROGRESS_LABELS,
  getEscrowCurrentStepTitle,
  getEscrowProgressIndex,
} from "@/lib/escrow-progress";
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

function ProgressDots({ activeIndex }: { activeIndex: number | null }) {
  if (activeIndex === null) return null;
  return (
    <ol className="mt-5 flex items-start justify-between gap-1">
      {ESCROW_PROGRESS_LABELS.map((label, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className={`grid size-8 place-items-center rounded-full text-xs font-black ring-2 ${
                done
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : current
                    ? "bg-white text-emerald-800 ring-emerald-500"
                    : "bg-slate-100 text-slate-400 ring-slate-200"
              }`}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`max-w-full truncate text-center text-[10px] font-bold leading-tight ${
                current ? "text-emerald-900" : done ? "text-slate-700" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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

  const role = isOwner ? "client" : "provider";
  const progressIndex = getEscrowProgressIndex(escrow.status, contractAccepted);
  const stepTitle = getEscrowCurrentStepTitle(
    escrow.status,
    role,
    contractAccepted,
  );

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

  const showBank =
    contractAccepted &&
    (escrow.status === "PENDING_FUNDING" ||
      escrow.status === "PAYMENT_SUBMITTED");

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-200 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
          <ShieldCheck className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {ESCROW_UI.badge}
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {stepTitle}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            {ESCROW_UI.amountLine(
              formatAmd(escrow.contractAmount),
              formatAmd(escrow.providerReceives),
              escrow.platformFeePercent,
              formatAmd(escrow.platformFeeAmount),
            )}
          </p>
        </div>
      </div>

      <ProgressDots activeIndex={progressIndex} />

      {showBank && isOwner ? (
        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {ESCROW_UI.bankTitle}
          </p>
          <dl className="space-y-3 text-base font-semibold text-slate-800">
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
              <dd className="font-mono tracking-wide">{bank.accountNumber}</dd>
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
            <p className="text-sm font-semibold leading-relaxed text-slate-600">
              {bank.hint}
            </p>
          ) : null}

          {escrow.status === "PENDING_FUNDING" ? (
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-bold text-slate-600">
                {ESCROW_UI.noteOptional}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold"
                  placeholder={ESCROW_UI.notePlaceholder}
                  maxLength={500}
                />
              </label>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void submitPayment()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 text-base font-black text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy === "pay" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : null}
                {ESCROW_UI.submitPayment}
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold leading-relaxed text-amber-900 ring-1 ring-amber-200">
              {ESCROW_UI.paymentReview}
            </p>
          )}
        </div>
      ) : null}

      {showBank && isProvider ? (
        <p className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold leading-relaxed text-slate-700 ring-1 ring-slate-200">
          {escrow.status === "PAYMENT_SUBMITTED"
            ? ESCROW_UI.paymentReview
            : ESCROW_UI.waitTransfer}
        </p>
      ) : null}

      {escrow.status === "FUNDED" ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold leading-relaxed text-emerald-900 ring-1 ring-emerald-200 sm:text-base">
            {isProvider ? ESCROW_UI.fundedProvider : ESCROW_UI.fundedClient}
          </p>
          {isOwner ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void requestRelease()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "release" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : null}
              {ESCROW_UI.releaseCta}
            </button>
          ) : null}
        </div>
      ) : null}

      {escrow.status === "RELEASE_PENDING" ? (
        <p className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold leading-relaxed text-amber-950 ring-1 ring-amber-200">
          {ESCROW_UI.releasePending}
        </p>
      ) : null}

      {escrow.status === "DISPUTED" ? (
        <div className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold leading-relaxed text-rose-900 ring-1 ring-rose-200">
          <p>{ESCROW_UI.disputed}</p>
          {escrow.disputeReason ? (
            <p className="mt-2 font-semibold">{escrow.disputeReason}</p>
          ) : null}
        </div>
      ) : null}

      {(escrow.status === "FUNDED" || escrow.status === "RELEASE_PENDING") &&
      (isOwner || isProvider) ? (
        <div className="mt-5">
          {!showDispute ? (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="text-sm font-bold text-rose-700 underline-offset-2 hover:underline"
            >
              {ESCROW_UI.openDispute}
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-base font-semibold"
                placeholder={ESCROW_UI.disputePlaceholder}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void openDispute()}
                  className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {busy === "dispute" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    ESCROW_UI.submit
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDispute(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700"
                >
                  {ESCROW_UI.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!contractAccepted && escrow.status === "AWAITING_CONTRACT" ? (
        <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-600">
          {ESCROW_UI.awaitingContract}
        </p>
      ) : null}
    </section>
  );
}
