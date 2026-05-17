"use client";

import {
  History,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Props = {
  isAdmin: boolean;
};

export function MobileProfileDropdown({ isAdmin }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Իմ հաշիվ"
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <UserCircle2 className="size-5" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-3 min-w-[min(100vw-2rem,280px)] overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200"
        >
          <Link
            role="menuitem"
            href={ROUTES.account}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <UserCircle2 className="size-4 text-amber-700" />
            Իմ հաշիվ
          </Link>
          <Link
            role="menuitem"
            href={ROUTES.accountSettings}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <Settings2 className="size-4 text-amber-700" />
            Կարգավորումներ
          </Link>
          <Link
            role="menuitem"
            href={ROUTES.myTenders}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <LayoutDashboard className="size-4 text-amber-700" />
            Իմ մրցույթներ
          </Link>
          <Link
            role="menuitem"
            href={ROUTES.bidHistory}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <History className="size-4 text-amber-700" />
            Իմ առաջարկներ
          </Link>
          <Link
            role="menuitem"
            href={ROUTES.likedTenders}
            onClick={close}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <Heart className="size-4 text-amber-700" />
            Իմ հավանածները
          </Link>
          {isAdmin ? (
            <Link
              role="menuitem"
              href={ROUTES.admin.dashboard}
              onClick={close}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              <ShieldCheck className="size-4 text-amber-700" />
              Կառավարման վահանակ
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            onClick={async () => {
              close();
              await signOut({ callbackUrl: ROUTES.home });
            }}
          >
            <LogOut className="size-4 text-amber-700" />
            Դուրս գալ
          </button>
        </div>
      ) : null}
    </div>
  );
}
