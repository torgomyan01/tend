"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatAmd } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type ConfirmState =
  | { kind: "loading" }
  | { kind: "succeeded"; balance: number; amount: number }
  | { kind: "pending"; amount: number }
  | { kind: "failed"; amount?: number; reason?: string }
  | { kind: "error"; message: string };

type Props = {
  orderNumber: string;
};

export function WalletReturnClient({ orderNumber: orderNumberRaw }: Props) {
  const router = useRouter();
  const orderNumber = Number(orderNumberRaw);

  const [state, setState] = useState<ConfirmState>({ kind: "loading" });

  const confirm = useCallback(async () => {
    if (!Number.isFinite(orderNumber) || orderNumber <= 0) {
      setState({ kind: "error", message: "Պատվերի համարը բացակայում է։" });
      return;
    }

    try {
      const res = await fetch("/api/account/wallet/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });

      const data = (await res.json().catch(() => null)) as {
        status?: string;
        balance?: number;
        amount?: number;
        reason?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        const message =
          data?.error === "UNAUTHENTICATED"
            ? "Մուտք գործեք՝ վճարումը հաստատելու համար։"
            : "Չհաջողվեց ստուգել վճարումը։";
        setState({ kind: "error", message });
        toastError("Վճարում", message);
        return;
      }

      if (data?.status === "SUCCEEDED") {
        setState({
          kind: "succeeded",
          balance: Number(data.balance ?? 0),
          amount: Number(data.amount ?? 0),
        });
        toastSuccess(
          "Դրամապանակը լիցքավորվեց",
          `Հաշվեկշիռ՝ ${formatAmd(Number(data.balance ?? 0))}`,
        );
        router.refresh();
        return;
      }

      if (data?.status === "PENDING") {
        setState({ kind: "pending", amount: Number(data.amount ?? 0) });
        return;
      }

      if (data?.status === "FAILED") {
        setState({
          kind: "failed",
          amount: typeof data.amount === "number" ? data.amount : undefined,
          reason: data.reason,
        });
        toastError("Վճարումը չհաջողվեց", data.reason ?? "Փորձեք նորից։");
        return;
      }

      setState({ kind: "error", message: "Անհայտ պատասխան։" });
    } catch {
      setState({ kind: "error", message: "Ցանցի խնդիր։" });
      toastError("Ցանցի խնդիր", "Չհաջողվեց ստուգել վճարումը։");
    }
  }, [orderNumber, router]);

  useEffect(() => {
    void confirm();
  }, [confirm]);

  useEffect(() => {
    if (state.kind !== "pending") return;
    const id = window.setInterval(() => {
      void confirm();
    }, 4000);
    return () => window.clearInterval(id);
  }, [state.kind, confirm]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      {state.kind === "loading" ? (
        <>
          <Loader2 className="size-10 animate-spin text-amber-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Վճարումը ստուգվում է…
          </h1>
          <p className="mt-2 text-sm text-slate-600">Խնդրում ենք սպասել։</p>
        </>
      ) : null}

      {state.kind === "pending" ? (
        <>
          <Loader2 className="size-10 animate-spin text-amber-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Վճարումը դեռ մշակվում է
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Գումար՝ {formatAmd(state.amount)}։ Կարգավիճակը կթարմացվի ավտոմատ։
          </p>
          <button
            type="button"
            onClick={() => void confirm()}
            className="mt-6 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-500"
          >
            Ստուգել նորից
          </button>
        </>
      ) : null}

      {state.kind === "succeeded" ? (
        <>
          <CheckCircle2 className="size-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Լիցքավորումը հաջողվեց
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            +{formatAmd(state.amount)} · Հաշվեկշիռ՝ {formatAmd(state.balance)}
          </p>
        </>
      ) : null}

      {state.kind === "failed" ? (
        <>
          <XCircle className="size-12 text-rose-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Վճարումը չհաջողվեց
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {state.reason ??
              (state.amount != null
                ? `Գումար՝ ${formatAmd(state.amount)}`
                : "Փորձեք նորից։")}
          </p>
        </>
      ) : null}

      {state.kind === "error" ? (
        <>
          <XCircle className="size-12 text-rose-600" />
          <h1 className="mt-4 text-xl font-black text-slate-900">Սխալ</h1>
          <p className="mt-2 text-sm text-slate-600">{state.message}</p>
        </>
      ) : null}

      <Link
        href={ROUTES.account}
        className="mt-8 text-sm font-black text-sky-700 underline-offset-2 hover:underline"
      >
        Վերադառնալ իմ հաշիվ
      </Link>
    </div>
  );
}
