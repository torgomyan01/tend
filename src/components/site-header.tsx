import Link from "next/link";
import { AuthDropdown } from "@/components/auth-dropdown";
import { LanguageDropdown } from "@/components/language-dropdown";
import { MobileMenu } from "@/components/mobile-menu";
import { ROUTES } from "@/lib/routes";

export function SiteHeader() {
  return (
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Link
        href={ROUTES.home}
        className="flex items-center gap-3"
        aria-label="Tend.am"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-xl shadow-slate-950/20">
          T
        </span>
        <span className="text-xl font-black tracking-tight">Tend.am</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
         <Link
          className="transition hover:text-slate-950"
          href={ROUTES.categories}
        >
          Ոլորտներ
        </Link>
        <a
          className="transition hover:text-slate-950"
          href={ROUTES.sections.howItWorks}
        >
          Ինչպես է աշխատում
        </a>
        <a
          className="transition hover:text-slate-950"
          href={ROUTES.sections.features}
        >
          Հնարավորություններ
        </a>
        <a
          className="transition hover:text-slate-950"
          href={ROUTES.sections.providers}
        >
          Մասնագետների համար
        </a>
      </nav>
      <div className="flex items-center gap-3">
        <LanguageDropdown />
        <AuthDropdown />
        <MobileMenu />
      </div>
    </header>
  );
}
