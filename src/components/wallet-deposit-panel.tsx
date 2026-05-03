"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { formatAmd } from "@/lib/format";

const PRESETS = [5000, 10_000, 25_000, 50_000] as const;

type Props = {
  /** Called after successful deposit */
  onDeposited?: () => void;
  compact?: boolean;
};

export function WalletDepositPanel({ onDeposited, compact }: Props) {
  const [amountText, setAmountText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parseAmount = useCallback(() => {
    const digits = amountText.replace(/\D/g, "");
    if (!digits) return null;
    const n = Number(digits);
    if (!Number.isFinite(n) || n < 500) return null;
    if (n > 50_000_000) return null;
    return Math.floor(n);
  }, [amountText]);

  const formatDepositInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (!digits) return "";
    return new Intl.NumberFormat("hy-AM").format(Number(digits));
  };

  const deposit = async (amount: number) => {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/account/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        balance?: number;
      } | null;

      if (!res.ok) {
        if (data?.error === "USER_BLOCKED") {
          setError("Հաշիվը արգելափակված է։");
        } else if (data?.error === "INVALID_PAYLOAD") {
          setError("Գումարի չափը սխալ է (մին․ 500 ֏)։");
        } else {
          setError("Լիցքավորումը ձախողվեց։");
        }
        return;
      }

      const bal = typeof data?.balance === "number" ? data.balance : null;
      setSuccess(
        bal !== null ? `Հաշվեկշիռ՝ ${formatAmd(bal)}` : "Լիցքավորված է։",
      );
      onDeposited?.();
      setAmountText("");
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setPending(false);
    }
  };

  const submitCustom = () => {
    const n = parseAmount();
    if (n === null) {
      setError("Մուտքագրեք ամբողջ թիվ՝ նվազագույնը 500 ֏։");
      return;
    }
    void deposit(n);
  };

  const presetCls = compact
    ? "rounded-xl px-2.5 py-1.5 text-[11px] font-black"
    : "rounded-2xl px-3 py-2 text-xs font-black";

  return (
    <div className="space-y-3">
      <p className={compact ? "text-[10px] font-black uppercase tracking-wide text-slate-500" : "text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"}>
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
          placeholder="օրինակ՝ 15000"
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
          Լիցքավորել
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
          {success}
        </p>
      ) : null}

      <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
        Այս փուլում վճարումը սիմուլացված է՝ զարգացման համար։ Ապագայում այստեղ
        կմիացվի իրական վճարային համակարգ։
      </p>
    </div>
  );
}
