"use client";

import { ChevronDown, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  AccountMenuPanel,
  initialsFromLabel,
} from "@/components/account-menu-panel";
import { ROUTES } from "@/lib/routes";

type Props = {
  isLoggedIn: boolean;
  label: string;
  isAdmin: boolean;
};

export function AuthDropdown({ isLoggedIn, label, isAdmin }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div ref={dropdownRef} className="relative hidden md:block">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white py-2.5 pl-2.5 pr-4 text-sm font-bold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        {isLoggedIn ? (
          <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-amber-200 to-amber-400 text-[11px] font-black text-slate-950 shadow-inner">
            {initialsFromLabel(label)}
          </span>
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-slate-950 text-amber-300">
            <UserPlus className="size-3.5" />
          </span>
        )}
        <span className="max-w-36 truncate">
          {isLoggedIn ? label : "Սկսել հիմա"}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-3 w-[min(18.5rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/90"
          style={{ animation: "tend-dropdown-in 160ms ease-out" }}
        >
          {isLoggedIn ? (
            <AccountMenuPanel
              label={label}
              isAdmin={isAdmin}
              onNavigate={close}
            />
          ) : (
            <div className="p-3">
              <div className="rounded-2xl bg-linear-to-br from-slate-950 to-slate-800 px-4 py-4 text-white">
                <p className="text-sm font-black tracking-tight">
                  Միացեք Tend.am-ին
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">
                  Մրցույթներ, առաջարկներ և մասնագետներ՝ մեկ հաշվում։
                </p>
              </div>
              <div className="mt-2 space-y-0.5">
                <Link
                  role="menuitem"
                  href={ROUTES.login}
                  onClick={close}
                  className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                    <LogIn className="size-4" />
                  </span>
                  Մուտք
                </Link>
                <Link
                  role="menuitem"
                  href={ROUTES.register}
                  onClick={close}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-300"
                >
                  <UserPlus className="size-4" />
                  Գրանցում
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
