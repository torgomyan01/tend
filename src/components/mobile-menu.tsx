"use client";

import { Languages, LogIn, Menu, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";

const navItems = [
  { label: "Մրցույթներ", href: ROUTES.tenders },
  { label: "Ինչպես է աշխատում", href: ROUTES.sections.howItWorks },
  { label: "Հնարավորություններ", href: ROUTES.sections.features },
  { label: "Ոլորտներ", href: ROUTES.categories },
  { label: "Մասնագետների համար", href: ROUTES.sections.providers },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

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
        <div className="absolute left-4 right-4 top-20 z-50 overflow-hidden rounded-4xl bg-white p-3 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-3xl px-4 py-3 text-base font-black text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

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

          <div className="mt-3 grid gap-2">
            <Link
              href={ROUTES.login}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 rounded-3xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
            >
              <LogIn className="size-4" />
              Մուտք
            </Link>
            <Link
              href={ROUTES.register}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-200"
            >
              <UserPlus className="size-4 text-amber-700" />
              Գրանցում
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
