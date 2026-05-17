"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  CreditCard,
  Flag,
  Gauge,
  Gavel,
  Headphones,
  Layers,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import type { AdminModerationCounts } from "@/lib/admin-moderation-counts";

type BadgeKey = keyof AdminModerationCounts;
type BadgeTone = "amber" | "rose" | "emerald" | "slate";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof Gauge;
  badgeKey?: BadgeKey;
  /** Style tone for the badge based on urgency */
  badgeTone?: BadgeTone;
};

const NAV_GROUPS: Array<{
  title: string;
  items: NavItem[];
}> = [
  {
    title: "Ընդհանուր",
    items: [
      {
        href: ROUTES.admin.dashboard,
        label: "Գլխավոր էջ",
        description: "Ընդհանուր ցուցանիշներ",
        icon: Gauge,
      },
    ],
  },
  {
    title: "Մոդերացիա",
    items: [
      {
        href: ROUTES.admin.verifications,
        label: "Վերիֆիկացիա",
        description: "Հաստատման հայտեր",
        icon: BadgeCheck,
        badgeKey: "verifications",
        badgeTone: "amber",
      },
      {
        href: ROUTES.admin.tenders,
        label: "Մրցույթներ",
        description: "Հայտարարություններ",
        icon: BriefcaseBusiness,
        badgeKey: "tenders",
        badgeTone: "amber",
      },
      {
        href: ROUTES.admin.tenderComplaints,
        label: "Բողոքներ",
        description: "Մրցույթների մասին հաղորդումներ",
        icon: Flag,
        badgeKey: "tenderComplaints",
        badgeTone: "rose",
      },
      {
        href: ROUTES.admin.bids,
        label: "Առաջարկներ",
        description: "Մասնագետների առաջարկներ",
        icon: Gavel,
        badgeKey: "bids",
        badgeTone: "amber",
      },
      {
        href: ROUTES.admin.reviews,
        label: "Կարծիքներ",
        description: "Գնահատականներ",
        icon: Star,
        badgeKey: "reviews",
        badgeTone: "amber",
      },
      {
        href: ROUTES.admin.services,
        label: "Ոլորտներ",
        description: "Ծառայությունների կատալոգ",
        icon: Layers,
      },
      {
        href: ROUTES.admin.support,
        label: "Աջակցություն",
        description: "Օգտատերերի հաղորդագրություններ",
        icon: Headphones,
        badgeKey: "supportChats",
        badgeTone: "rose",
      },
    ],
  },
  {
    title: "Մարդիկ ու ֆինանսներ",
    items: [
      {
        href: ROUTES.admin.users,
        label: "Օգտատերեր",
        description: "Հաճախորդներ ու մասնագետներ",
        icon: Users,
        badgeKey: "blockedUsers",
        badgeTone: "rose",
      },
      {
        href: ROUTES.admin.transactions,
        label: "Գործարքներ",
        description: "Բոլոր վճարումները",
        icon: CreditCard,
      },
      {
        href: ROUTES.admin.subscriptions,
        label: "Բաժանորդագրություններ",
        description: "Ակտիվ փաթեթներ",
        icon: Sparkles,
      },
    ],
  },
];

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  amber: "bg-amber-500 text-white",
  rose: "bg-rose-600 text-white",
  emerald: "bg-emerald-600 text-white",
  slate: "bg-slate-300 text-slate-900",
};

function NavBadge({
  count,
  active,
  tone,
}: {
  count: number;
  active: boolean;
  tone: BadgeTone;
}) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black tabular-nums ring-2 ring-white ${
        active
          ? "bg-amber-300 text-slate-950 ring-slate-950"
          : BADGE_TONE_CLASS[tone]
      }`}
      aria-label={`${count} սպասում է ստուգման`}
    >
      {display}
    </span>
  );
}

type AdminSidebarProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
  counts: AdminModerationCounts;
};

export function AdminSidebar({ user, counts }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const totalPending =
    counts.verifications +
    counts.tenders +
    counts.bids +
    counts.reviews +
    counts.tenderComplaints;

  const sidebarBody = (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3 px-2">
        <Link
          href={ROUTES.admin.dashboard}
          className="flex items-center gap-3"
          onClick={() => setIsMobileOpen(false)}
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">
            T
          </span>
          <span>
            <span className="block text-base font-black tracking-tight">
              Tend.am
            </span>
            <span className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              <ShieldCheck className="size-3.5" /> Կառավարում
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 lg:hidden"
          aria-label="Փակել մենյուն"
        >
          <X className="size-4" />
        </button>
      </div>

      {totalPending > 0 ? (
        <div className="rounded-2xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Մոդերացիայի հերթ
          </p>
          <p className="mt-0.5 text-sm font-black text-amber-950">
            {totalPending} տարր սպասում է ստուգման
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Մոդերացիայի հերթ
          </p>
          <p className="mt-0.5 text-sm font-black text-emerald-900">
            Չկան անավարտ ստուգումներ
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === ROUTES.admin.dashboard
                    ? pathname === item.href
                    : pathname?.startsWith(item.href) ?? false;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                        isActive
                          ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-xl transition ${
                          isActive
                            ? "bg-white/10 text-amber-300"
                            : "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-black leading-tight">
                          {item.label}
                        </span>
                        <span
                          className={`truncate text-[11px] font-semibold leading-tight ${
                            isActive ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </span>
                      </span>
                      {item.badgeKey ? (
                        <NavBadge
                          count={counts[item.badgeKey]}
                          active={isActive}
                          tone={item.badgeTone ?? "amber"}
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="rounded-3xl bg-slate-100 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
            {user.name.charAt(0).toUpperCase() || "A"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {user.name || "Admin"}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {user.role === "ADMIN" ? "Գերադմին" : "Մոդերատոր"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={ROUTES.account}
            className="flex-1 rounded-2xl bg-white px-3 py-2 text-center text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Անցնել կայք
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: ROUTES.home })}
            className="grid size-9 place-items-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            aria-label="Դուրս գալ"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
        {sidebarBody}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link href={ROUTES.admin.dashboard} className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
            T
          </span>
          <span className="text-sm font-black tracking-tight">
            Tend.am · Կառավարում
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="grid size-10 place-items-center rounded-full bg-slate-950 text-white"
          aria-label="Բացել մենյուն"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Փակել մենյուն"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white p-5 shadow-2xl">
            {sidebarBody}
          </div>
        </div>
      ) : null}
    </>
  );
}
