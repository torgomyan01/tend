"use client";

import {
  BriefcaseBusiness,
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
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

export function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

type MenuLinkProps = {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  accent?: "default" | "admin";
};

function MenuLink({
  href,
  icon,
  children,
  onClick,
  accent = "default",
}: MenuLinkProps) {
  const iconWrap =
    accent === "admin"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-amber-50 text-amber-800 ring-amber-100/80";

  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-slate-700 transition active:bg-slate-100 hover:bg-slate-50 hover:text-slate-950"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition group-hover:scale-[1.03] ${iconWrap}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

type Props = {
  label: string;
  isAdmin: boolean;
  onNavigate: () => void;
};

/** Shared logged-in account menu body (desktop + mobile). */
export function AccountMenuPanel({ label, isAdmin, onNavigate }: Props) {
  return (
    <>
      <div className="border-b border-slate-100 bg-linear-to-br from-slate-50 via-white to-amber-50/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-amber-200 to-amber-400 text-sm font-black text-slate-950 shadow-sm">
            {initialsFromLabel(label)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{label}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {isAdmin ? "Ադմին · Tend.am" : "Ձեր հաշիվը"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        <p className="px-3 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Հաշիվ
        </p>
        <MenuLink
          href={ROUTES.account}
          onClick={onNavigate}
          icon={<UserCircle2 className="size-4" />}
        >
          Իմ հաշիվ
        </MenuLink>
        <MenuLink
          href={ROUTES.accountSettings}
          onClick={onNavigate}
          icon={<Settings2 className="size-4" />}
        >
          Կարգավորումներ
        </MenuLink>

        <div className="mx-2 my-1.5 border-t border-slate-100" />

        <p className="px-3 pb-1 pt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Աշխատանք
        </p>
        <MenuLink
          href={ROUTES.myTenders}
          onClick={onNavigate}
          icon={<LayoutDashboard className="size-4" />}
        >
          Իմ մրցույթները
        </MenuLink>
        <MenuLink
          href={ROUTES.accountMyWork}
          onClick={onNavigate}
          icon={<BriefcaseBusiness className="size-4" />}
        >
          Իմ աշխատանքները
        </MenuLink>
        <MenuLink
          href={ROUTES.bidHistory}
          onClick={onNavigate}
          icon={<History className="size-4" />}
        >
          Իմ առաջարկներ
        </MenuLink>
        <MenuLink
          href={ROUTES.likedTenders}
          onClick={onNavigate}
          icon={<Heart className="size-4" />}
        >
          Իմ հավանածները
        </MenuLink>

        {isAdmin ? (
          <>
            <div className="mx-2 my-1.5 border-t border-slate-100" />
            <MenuLink
              href={ROUTES.admin.dashboard}
              onClick={onNavigate}
              accent="admin"
              icon={<ShieldCheck className="size-4" />}
            >
              Կառավարման վահանակ
            </MenuLink>
          </>
        ) : null}

        <div className="mx-2 my-1.5 border-t border-slate-100" />
        <button
          type="button"
          role="menuitem"
          className="group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-rose-700 transition active:bg-rose-100 hover:bg-rose-50"
          onClick={async () => {
            onNavigate();
            await signOut({ callbackUrl: ROUTES.home });
          }}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-100 transition group-hover:scale-[1.03]">
            <LogOut className="size-4" />
          </span>
          Դուրս գալ
        </button>
      </div>
    </>
  );
}
