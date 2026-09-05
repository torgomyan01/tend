"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { formatAmd } from "@/lib/format";
import { toastError } from "@/lib/toast";

const PRESETS = [10, 5000, 10_000, 25_000, 50_000, 100_000] as const;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 100_000;

type Props = {
  /** Called after successful deposit (unused for redirect flow; kept for API compat) */
  onDeposited?: () => void;
  compact?: boolean;
};

export function WalletDepositPanel({ compact }: Props) {
  const [amountText, setAmountText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseAmount = useCallback(() => {
    const digits = amountText.replace(/\D/g, "");
    if (!digits) return null;
    const n = Number(digits);
    if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) return null;
    return Math.floor(n);
  }, [amountText]);

  const formatDepositInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (!digits) return "";
    return new Intl.NumberFormat("hy-AM").format(Number(digits));
  };

  const deposit = async (amount: number) => {
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      setError(`Գումարը պետք է լինի ${MIN_AMOUNT}–${MAX_AMOUNT} ֏։`);
      toastError(
        "Սխալ գումար",
        `Գումարը պետք է լինի ${MIN_AMOUNT}–${MAX_AMOUNT} ֏։`,
      );
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/account/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        redirectURL?: string;
      } | null;

      if (!res.ok) {
        let message = "Լիցքավորումը ձախողվեց։";
        if (data?.error === "USER_BLOCKED") {
          message = "Հաշիվը արգելափակված է։";
        } else if (data?.error === "INVALID_PAYLOAD") {
          message = `Գումարի չափը սխալ է (${MIN_AMOUNT}–${MAX_AMOUNT} ֏)։`;
        } else if (data?.error === "PHONE_REQUIRED") {
          message = "Լիցքավորման համար անհրաժեշտ է հեռախոսահամար։";
        } else if (data?.error === "VPOS_CUSTOMER_FAILED") {
          message = data.message ?? "Չհաջողվեց գրանցել հաճախորդին վճարային համակարգում։";
        } else if (
          data?.error === "VPOS_UNAVAILABLE" ||
          data?.error === "VPOS_ORDER_FAILED" ||
          data?.error === "VPOS_NOT_CONFIGURED"
        ) {
          message =
            data.message ??
            "Վճարային համակարգը ժամանակավորապես անհասանելի է։";
        }
        setError(message);
        toastError("Լիցքավորումը չհաջողվեց", message);
        return;
      }

      if (!data?.redirectURL) {
        setError("Վճարման հասցեն չստացվեց։");
        toastError("Լիցքավորումը չհաջողվեց", "Վճարման հասցեն չստացվեց։");
        return;
      }

      window.location.assign(data.redirectURL);
    } catch {
      setError("Ցանցի խնդիր։");
      toastError("Ցանցի խնդիր", "Չհաջողվեց սկսել վճարումը։ Փորձեք նորից։");
      setPending(false);
    }
  };

  const submitCustom = () => {
    const n = parseAmount();
    if (n === null) {
      setError(`Մուտքագրեք ամբողջ թիվ՝ ${MIN_AMOUNT}–${MAX_AMOUNT} ֏։`);
      toastError(
        "Սխալ գումար",
        `Մուտքագրեք ամբողջ թիվ՝ ${MIN_AMOUNT}–${MAX_AMOUNT} ֏։`,
      );
      return;
    }
    void deposit(n);
  };

  const presetCls = compact
    ? "rounded-xl px-2.5 py-1.5 text-[11px] font-black"
    : "rounded-2xl px-3 py-2 text-xs font-black";

  return (
    <div className="space-y-3">
      <p
        className={
          compact
            ? "text-[10px] font-black uppercase tracking-wide text-slate-500"
            : "text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
        }
      >
        Արագ գումարներ
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={pending}
            onClick={() => void deposit(amt)}
            className={`${presetCls} bg-slate-100 text-slate-800 ring-1 ring-slate-200 transition hover:bg-amber-50 hover:ring-amber-200 disabled:opacity-50`}
          >
            +{formatAmd(amt)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
          Այլ գումար (֏)
        </label>
        <input
          inputMode="numeric"
          placeholder="օրինակ՝ 10 կամ 15000"
          value={amountText}
          disabled={pending}
          onChange={(e) => setAmountText(formatDepositInput(e.target.value))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => void submitCustom()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Վճարել քարտով
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
        Վճարումը կատարվում է ITF VPOS-ով ({MIN_AMOUNT}–{MAX_AMOUNT} ֏)։
        Գումարը գանձվում է անմիջապես։
      </p>
    </div>
  );
}
