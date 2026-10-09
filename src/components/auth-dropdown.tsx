"use client";

import {
  BriefcaseBusiness,
  ChevronDown,
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
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

type Props = {
  isLoggedIn: boolean;
  label: string;
  isAdmin: boolean;
};

type MenuLinkProps = {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  accent?: "default" | "admin" | "danger";
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
      : accent === "danger"
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : "bg-amber-50 text-amber-800 ring-amber-100/80";

  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
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

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

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
            <>
              <div className="border-b border-slate-100 bg-linear-to-br from-slate-50 via-white to-amber-50/60 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-amber-200 to-amber-400 text-sm font-black text-slate-950 shadow-sm">
                    {initialsFromLabel(label)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {label}
                    </p>
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
                  onClick={close}
                  icon={<UserCircle2 className="size-4" />}
                >
                  Իմ հաշիվ
                </MenuLink>
                <MenuLink
                  href={ROUTES.accountSettings}
                  onClick={close}
                  icon={<Settings2 className="size-4" />}
                >
                  Կարգավորումներ
                </MenuLink>

                <div className="my-1.5 mx-2 border-t border-slate-100" />

                <p className="px-3 pb-1 pt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Աշխատանք
                </p>
                <MenuLink
                  href={ROUTES.myTenders}
                  onClick={close}
                  icon={<LayoutDashboard className="size-4" />}
                >
                  Իմ մրցույթները
                </MenuLink>
                <MenuLink
                  href={ROUTES.accountMyWork}
                  onClick={close}
                  icon={<BriefcaseBusiness className="size-4" />}
                >
                  Իմ աշխատանքները
                </MenuLink>
                <MenuLink
                  href={ROUTES.bidHistory}
                  onClick={close}
                  icon={<History className="size-4" />}
                >
                  Իմ առաջարկներ
                </MenuLink>
                <MenuLink
                  href={ROUTES.likedTenders}
                  onClick={close}
                  icon={<Heart className="size-4" />}
                >
                  Իմ հավանածները
                </MenuLink>

                {isAdmin ? (
                  <>
                    <div className="my-1.5 mx-2 border-t border-slate-100" />
                    <MenuLink
                      href={ROUTES.admin.dashboard}
                      onClick={close}
                      accent="admin"
                      icon={<ShieldCheck className="size-4" />}
                    >
                      Կառավարման վահանակ
                    </MenuLink>
                  </>
                ) : null}

                <div className="my-1.5 mx-2 border-t border-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  className="group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                  onClick={async () => {
                    close();
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
