"use client";

import {
  History,
  Languages,
  LayoutDashboard,
  LogIn,
  Menu,
  Settings2,
  ShieldCheck,
  UserCircle2,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { WalletDepositPanel } from "@/components/wallet-deposit-panel";
import { formatAmd } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

const navItems = [
  { label: "Մրցույթներ", href: ROUTES.tenders },
  { label: "Ինչպես է աշխատում", href: ROUTES.sections.howItWorks },
  { label: "Ոլորտներ", href: ROUTES.categories },
  { label: "Մասնագետների համար", href: ROUTES.sections.providers },
];

export function MobileMenu() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const loggedIn = status === "authenticated" && Boolean(session?.user?.id);
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  const refreshWallet = useCallback(async () => {
    if (!loggedIn) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/account/wallet", { cache: "no-store" });
      if (!res.ok) {
        setWalletBalance(null);
        return;
      }
      const data = (await res.json()) as { balance?: number };
      setWalletBalance(typeof data.balance === "number" ? data.balance : null);
    } catch {
      setWalletBalance(null);
    } finally {
      setWalletLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!isOpen || !loggedIn) return;
    void refreshWallet();
  }, [isOpen, loggedIn, refreshWallet]);

  const close = () => setIsOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Փակել մենյուն" : "Բացել մենյուն"}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="grid size-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {isOpen ? (
        <div className="absolute left-4 right-4 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-4xl bg-white p-3 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                className="rounded-3xl px-4 py-3 text-base font-black text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="my-3 h-px bg-slate-100" />

          {loggedIn ? (
            <>
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2">
                  <Wallet className="size-5 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Դրամապանակ
                    </p>
                    <p className="truncate text-lg font-black tabular-nums text-slate-900">
                      {walletLoading && walletBalance === null
                        ? "…"
                        : walletBalance !== null
                          ? formatAmd(walletBalance)
                          : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <WalletDepositPanel
                    compact
                    onDeposited={() => {
                      void refreshWallet();
                      router.refresh();
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Link
                  href={ROUTES.account}
                  onClick={close}
                  className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
                >
                  <UserCircle2 className="size-4 text-amber-700" />
                  Իմ հաշիվ
                </Link>
                <Link
                  href={ROUTES.accountSettings}
                  onClick={close}
                  className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
                >
                  <Settings2 className="size-4 text-amber-700" />
                  Կարգավորումներ
                </Link>
                <Link
                  href={ROUTES.myTenders}
                  onClick={close}
                  className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
                >
                  <LayoutDashboard className="size-4 text-amber-700" />
                  Իմ մրցույթներ
                </Link>
                <Link
                  href={ROUTES.bidHistory}
                  onClick={close}
                  className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
                >
                  <History className="size-4 text-amber-700" />
                  Իմ առաջարկներ
                </Link>
                {isAdmin ? (
                  <Link
                    href={ROUTES.admin.dashboard}
                    onClick={close}
                    className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
                  >
                    <ShieldCheck className="size-4 text-amber-700" />
                    Կառավարման վահանակ
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                  onClick={async () => {
                    close();
                    await signOut({ callbackUrl: ROUTES.home });
                  }}
                >
                  Դուրս գալ
                </button>
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Link
                href={ROUTES.login}
                onClick={close}
                className="flex items-center justify-center gap-2 rounded-3xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                <LogIn className="size-4" />
                Մուտք
              </Link>
              <Link
                href={ROUTES.register}
                onClick={close}
                className="flex items-center justify-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-200"
              >
                <UserPlus className="size-4 text-amber-700" />
                Գրանցում
              </Link>
            </div>
          )}

          <div className="my-3 h-px bg-slate-100" />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-3xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800"
            >
              <Languages className="size-4" />
              Հայերեն
            </button>
            <button
              type="button"
              className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600"
            >
              English
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
