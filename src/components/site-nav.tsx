"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("/#")) {
    return pathname === ROUTES.home;
  }
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return active
    ? "text-slate-950 underline decoration-amber-500/60 underline-offset-8"
    : "text-slate-600 transition hover:text-slate-950";
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
      <Link
        className={navLinkClass(isActivePath(pathname, ROUTES.tenders))}
        href={ROUTES.tenders}
      >
        Մրցույթներ
      </Link>
      <Link
        className={navLinkClass(isActivePath(pathname, ROUTES.categories))}
        href={ROUTES.categories}
      >
        Ոլորտներ
      </Link>
      <Link
        className={navLinkClass(isActivePath(pathname, ROUTES.sections.howItWorks))}
        href={ROUTES.sections.howItWorks}
      >
        Ինչպես է աշխատում
      </Link>
      <Link
        className={navLinkClass(isActivePath(pathname, ROUTES.sections.providers))}
        href={ROUTES.sections.providers}
      >
        Մասնագետների համար
      </Link>
    </nav>
  );
}

