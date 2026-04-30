"use client";

import { ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const languages = [
  { code: "hy", label: "Հայերեն" },
  { code: "en", label: "English" },
];

export function LanguageDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
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
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
      >
        <Languages className="size-4 text-amber-700" />
        {selectedLanguage.label}
        <ChevronDown className="size-4 text-slate-400" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-3 w-40 overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200"
        >
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              role="menuitem"
              onClick={() => {
                setSelectedLanguage(language);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                selectedLanguage.code === language.code
                  ? "bg-amber-50 text-amber-800"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {language.label}
              <span className="text-xs uppercase">{language.code}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
