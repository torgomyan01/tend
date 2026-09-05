"use client";

import {
  History,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings2,
  ShieldCheck,
  UserCircle2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Props = {
  isLoggedIn: boolean;
  label: string;
  isAdmin: boolean;
};

export function AuthDropdown({ isLoggedIn, label, isAdmin }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={dropdownRef} className="relative hidden md:block">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="inline-flex rounded-full cursor-pointer bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        {isLoggedIn ? label : "Սկսել հիմա"}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-3 min-w-52 overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200"
        >
          {isLoggedIn ? (
            <>
              <Link
                role="menuitem"
                href={ROUTES.account}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <UserCircle2 className="size-4 text-amber-700" />
                Իմ հաշիվ
              </Link>
              <Link
                role="menuitem"
                href={ROUTES.accountSettings}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <Settings2 className="size-4 text-amber-700" />
                Կարգավորումներ
              </Link>
              <Link
                role="menuitem"
                href={ROUTES.myTenders}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="size-4 text-amber-700" />
                Իմ մրցույթները
              </Link>
              <Link
                role="menuitem"
                href={ROUTES.bidHistory}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <History className="size-4 text-amber-700" />
                Իմ առաջարկներ
              </Link>
              <Link
                role="menuitem"
                href={ROUTES.likedTenders}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <Heart className="size-4 text-amber-700" />
                Իմ հավանածները
              </Link>
              {isAdmin ? (
                <Link
                  role="menuitem"
                  href={ROUTES.admin.dashboard}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  onClick={() => setIsOpen(false)}
                >
                  <ShieldCheck className="size-4 text-amber-700" />
                  Կառավարման վահանակ
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={async () => {
                  setIsOpen(false);
                  await signOut({ callbackUrl: ROUTES.home });
                }}
              >
                <LogOut className="size-4 text-amber-700" />
                Դուրս գալ
              </button>
            </>
          ) : (
            <>
              <Link
                role="menuitem"
                href={ROUTES.login}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="size-4 text-amber-700" />
                Մուտք
              </Link>
              <Link
                role="menuitem"
                href={ROUTES.register}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsOpen(false)}
              >
                <UserPlus className="size-4 text-amber-700" />
                Գրանցում
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
