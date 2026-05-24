"use client";

import {
  BriefcaseBusiness,
  CircleHelp,
  LayoutGrid,
  LogIn,
  Menu,
  UserPlus,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { WalletDepositPanel } from "@/components/wallet-deposit-panel";
import { formatAmd } from "@/lib/format";
import { MobileProfileDropdown } from "@/components/mobile-profile-dropdown";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { ROUTES } from "@/lib/routes";

const navItems = [
  {
    label: "Մրցույթներ",
    href: ROUTES.tenders,
    icon: BriefcaseBusiness,
    accent: "bg-amber-100 text-amber-800 ring-amber-200/80",
  },
  {
    label: "Ինչպես է աշխատում",
    href: ROUTES.sections.howItWorks,
    icon: CircleHelp,
    accent: "bg-sky-100 text-sky-800 ring-sky-200/80",
  },
  {
    label: "Ոլորտներ",
    href: ROUTES.categories,
    icon: LayoutGrid,
    accent: "bg-violet-100 text-violet-800 ring-violet-200/80",
  },
  {
    label: "Մասնագետների համար",
    href: ROUTES.sections.providers,
    icon: Wrench,
    accent: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  },
] as const;

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export function MobileMenu({ isLoggedIn, isAdmin }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const refreshWallet = useCallback(async () => {
    if (!isLoggedIn) return;
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
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;
    void refreshWallet();
  }, [isOpen, isLoggedIn, refreshWallet]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className="relative flex items-center gap-2 md:hidden">
      {isLoggedIn ? (
        <NotificationsDropdown isLoggedIn={isLoggedIn} />
      ) : null}
      {isLoggedIn ? <MobileProfileDropdown isAdmin={isAdmin} /> : null}
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
        <>
          <button
            type="button"
            aria-label="Փակել մենյուն"
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={close}
          />
          <div className="fixed inset-x-3 top-[4.25rem] z-[1000] box-border max-h-[calc(100dvh-5.5rem)] w-[calc(100vw-1.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[1.75rem] bg-gradient-to-b from-white via-white to-amber-50/60 p-5 shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] ring-1 ring-white/80 sm:inset-x-4 sm:w-[calc(100vw-2rem)]">
            <div className="mb-5 flex min-w-0 items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
                  Նավիգացիա
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Ինչ եք փնտրում
                </p>
              </div>
             
            </div>

            <nav className="grid min-w-0 gap-2 sm:gap-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={close}
                    className="group flex items-center gap-2.5 rounded-xl bg-white/90 px-3 py-2.5 text-left shadow-sm ring-1 ring-slate-200/90 transition active:scale-[0.99] hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:ring-amber-200/60 sm:gap-4 sm:rounded-[1.25rem] sm:px-4 sm:py-4"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 sm:size-12 sm:rounded-2xl ${item.accent}`}
                    >
                      <Icon className="size-4 sm:size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-black leading-snug text-slate-800 group-hover:text-slate-950 sm:text-lg">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {isLoggedIn ? (
              <div className="relative mt-6 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl shadow-slate-950/25 ring-1 ring-slate-700/50">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-amber-400/20 blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-10 left-6 size-24 rounded-full bg-amber-500/10 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex items-start gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                    <Wallet className="size-7" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300/90">
                      Իմ դրամապանակը
                    </p>
                    <p className="mt-1 truncate text-3xl font-black tabular-nums tracking-tight">
                      {walletLoading && walletBalance === null
                        ? "…"
                        : walletBalance !== null
                          ? formatAmd(walletBalance)
                          : "—"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Լիցքավորեք հաշիվը մրցույթներին մասնակցելու համար
                    </p>
                  </div>
                </div>
                <div className="relative mt-5 min-w-0 overflow-hidden rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                  <WalletDepositPanel
                    compact
                    onDeposited={() => {
                      void refreshWallet();
                      router.refresh();
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-amber-50 via-white to-white p-5 ring-1 ring-amber-200/70">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">
                  Միացեք հարթակին
                </p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href={ROUTES.login}
                    onClick={close}
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-lg shadow-slate-950/20 transition active:scale-[0.99] hover:bg-slate-800"
                  >
                    <LogIn className="size-5" />
                    Մուտք
                  </Link>
                  <Link
                    href={ROUTES.register}
                    onClick={close}
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-4 text-base font-black text-slate-950 ring-1 ring-slate-200 transition active:scale-[0.99] hover:bg-slate-50"
                  >
                    <UserPlus className="size-5 text-amber-700" />
                    Գրանցում
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
