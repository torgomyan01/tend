"use client";

import { ChevronDown, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { WalletDepositPanel } from "@/components/wallet-deposit-panel";
import { formatAmd } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

export function WalletDropdown() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const loggedIn = status === "authenticated" && Boolean(session?.user?.id);

  const fetchBalance = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account/wallet", { cache: "no-store" });
      if (!res.ok) {
        setBalance(null);
        return;
      }
      const data = (await res.json()) as { balance?: number };
      setBalance(typeof data.balance === "number" ? data.balance : null);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) {
      setBalance(null);
      return;
    }
    void fetchBalance();
  }, [loggedIn, fetchBalance]);

  useEffect(() => {
    if (!open) return;
    void fetchBalance();
  }, [open, fetchBalance]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (!loggedIn) {
    return null;
  }

  const display =
    loading && balance === null ? (
      <Loader2 className="size-4 animate-spin text-slate-400" />
    ) : balance !== null ? (
      formatAmd(balance)
    ) : (
      "— ֏"
    );

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[220px] items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Wallet className="size-4 shrink-0 text-amber-700" />
        <span className="min-w-0 truncate tabular-nums">{display}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-3 w-[min(100vw-2rem,320px)] overflow-hidden rounded-3xl bg-white p-4 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Դրամապանակ
              </p>
              <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
                {balance !== null ? formatAmd(balance) : loading ? "…" : "—"}
              </p>
            </div>
            <Link
              href={ROUTES.account}
              className="shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50"
              onClick={() => setOpen(false)}
            >
              Իմ հաշիվ
            </Link>
          </div>

          <div className="mt-4">
            <WalletDepositPanel
              onDeposited={() => {
                void fetchBalance();
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
