"use client";

import { ChevronsUpDown, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LocationPickerOption } from "@/lib/locations-data";

type LocationPickerProps = {
  options: LocationPickerOption[];
  valueId: number | null;
  label: string;
  onChange: (id: number | null, displayLabel: string) => void;
  placeholder?: string;
};

export function LocationPicker({
  options,
  valueId,
  label,
  onChange,
  placeholder = "Ընտրեք մարզը և բնակավայրը",
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, options]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-900 outline-none transition hover:border-slate-400 focus:border-slate-950"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-slate-400" />
            <span className={`min-w-0 truncate ${valueId ? "" : "text-slate-400"}`}>
              {valueId ? label : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
        </button>
        {valueId ? (
          <button
            type="button"
            onClick={() => {
              onChange(null, "");
              setQuery("");
            }}
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Չեղարկել ընտրությունը"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-950/5">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Որոնել քաղաք կամ գյուղ…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {options.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-4 text-center text-xs font-bold leading-relaxed text-amber-900 ring-1 ring-amber-200">
                Բնակավայրերի ցանկը դատարկ է։ Գործարկեք՝{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">
                  npm run db:seed:locations
                </code>
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm font-semibold text-slate-500">
                «{query}» համապատասխանություն չկա։
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((option) => {
                  const selected = option.id === valueId;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(option.id, option.label);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          selected
                            ? "bg-slate-950 text-white"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className="line-clamp-2">{option.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="border-t border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Ընտրեք մարզը և քաղաքը կամ գյուղը
          </p>
        </div>
      ) : null}
    </div>
  );
}
