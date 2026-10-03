"use client";

import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  tenderId: string;
  contractId: string;
  status: "PENDING_CLIENT" | "PENDING_PROVIDER" | "ACCEPTED" | "CANCELLED";
  bodyText: string;
  clientAcceptedAt: string | null;
  providerAcceptedAt: string | null;
  providerName: string;
  tenderTitle: string;
  conversationId: string | null;
  isOwner: boolean;
  isProposedProvider: boolean;
  hasEscrow?: boolean;
};

export function ContractSignClient({
  tenderId,
  contractId,
  status,
  bodyText,
  clientAcceptedAt,
  providerAcceptedAt,
  providerName,
  tenderTitle,
  conversationId,
  isOwner,
  isProposedProvider,
  hasEscrow = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "cancel" | null>(null);

  const pending =
    status === "PENDING_CLIENT" || status === "PENDING_PROVIDER";

  const canAccept =
    (status === "PENDING_CLIENT" && isOwner) ||
    (status === "PENDING_PROVIDER" && isProposedProvider);

  const canCancel = pending && (isOwner || isProposedProvider);

  const statusLabel =
    status === "PENDING_CLIENT"
      ? "Սպասում է պատվիրատուի հաստատմանը"
      : status === "PENDING_PROVIDER"
        ? "Պատվիրատուն հաստատել է · սպասում է կատարողին"
        : status === "ACCEPTED"
          ? "Կնքված է · երկու կողմն էլ հաստատել են"
          : "Չեղարկված է";

  async function accept() {
    setBusy("accept");
    try {
      const res = await fetch(`/api/tenders/${tenderId}/contract/accept`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        status?: string;
      } | null;
      if (!res.ok) {
        const map: Record<string, string> = {
          WAITING_FOR_CLIENT: "Նախ պետք է հաստատի պատվիրատուն։",
          WAITING_FOR_PROVIDER: "Սպասում ենք կատարողի հաստատմանը։",
          NO_PENDING_CONTRACT: "Ընթացիկ պայմանագիր չկա։",
        };
        toastError(
          "Չհաջողվեց հաստատել",
          map[data?.error ?? ""] ?? "Փորձեք նորից։",
        );
        return;
      }
      if (data?.status === "ACCEPTED") {
        toastSuccess(
          "Պայմանագիրը կնքված է",
          hasEscrow
            ? "Կատարողը ընտրված է։ Հաջորդ քայլը՝ բանկային փոխանցում (տես վերևում)։"
            : "Կատարողը պաշտոնապես ընտրված է։",
        );
      } else {
        toastSuccess("Հաստատված է", "Սպասում ենք կատարողի հաստատմանը։");
      }
      router.refresh();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      const res = await fetch(`/api/tenders/${tenderId}/contract/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        toastError("Չեղարկումը ձախողվեց", "Փորձեք նորից։");
        return;
      }
      toastSuccess(
        "Չեղարկված է",
        isOwner
          ? "Կարող եք այլ կատարող ընտրել։"
          : "Պայմանագրի առաջարկը մերժված է։",
      );
      if (conversationId) {
        router.push(ROUTES.messageThread(conversationId));
      } else {
        router.push(ROUTES.tenderDetail(tenderId));
      }
      router.refresh();
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          Պայմանագիր · {contractId.slice(0, 8)}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {tenderTitle}
        </h1>
        <p className="mt-3 text-base font-bold text-slate-700 sm:text-lg">
          {statusLabel}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-500 sm:text-base">
          Առաջարկված կատարող՝ {providerName}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
          <span
            className={
              clientAcceptedAt
                ? "rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-800"
                : "rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500"
            }
          >
            Պատվիրատու
          </span>
          <span
            className={
              providerAcceptedAt
                ? "rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-800"
                : "rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500"
            }
          >
            Կատարող
          </span>
        </div>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
          <FileText className="size-4" />
          Պայմանագրի տեքստ
        </h2>
        <p className="mt-4 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold leading-relaxed text-amber-950 ring-1 ring-amber-200 sm:text-base">
          Հաստատելով՝ դուք ընդունում եք ստորև բերված տեքստը՝ իրավական ուժով։
          Պայմանագիրը միշտ պահպանվում է համակարգում։
        </p>
        <div className="mt-5 max-h-[min(70vh,720px)] overflow-y-auto rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-800 sm:text-base sm:leading-8">
            {bodyText}
          </pre>
        </div>
      </section>

      {pending ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canAccept ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void accept()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-base font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy === "accept" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
              Համաձայն եմ · Հաստատել
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void cancel()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-black text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {busy === "cancel" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <XCircle className="size-5" />
              )}
              Չեղարկել առաջարկը
            </button>
          ) : null}
          {!canAccept && isOwner && status === "PENDING_PROVIDER" ? (
            <p className="self-center text-sm font-semibold text-slate-500 sm:text-base">
              Սպասում ենք կատարողի հաստատմանը…
            </p>
          ) : null}
          {!canAccept &&
          isProposedProvider &&
          status === "PENDING_CLIENT" ? (
            <p className="self-center text-sm font-semibold text-slate-500 sm:text-base">
              Սպասում ենք պատվիրատուի հաստատմանը…
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-base font-bold">
        {conversationId ? (
          <a
            href={ROUTES.messageThread(conversationId)}
            className="text-amber-800 underline-offset-2 hover:underline"
          >
            Վերադառնալ զրույց
          </a>
        ) : null}
        <a
          href={ROUTES.tenderDetail(tenderId)}
          className="text-slate-600 underline-offset-2 hover:underline"
        >
          Մրցույթի էջ
        </a>
      </div>
    </div>
  );
}
