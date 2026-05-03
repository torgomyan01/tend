"use client";

import { ChevronRight, Layers, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { TendersCatalogFilterModal } from "@/components/tenders-catalog-filter-modal";
import { ROUTES } from "@/lib/routes";
import {
  MAX_CATALOG_PICKS,
  serializeCatalogPicks,
  type CatalogFilterSelection,
} from "@/lib/tenders-catalog-picks";
import type { ServiceCategoryWithServices } from "@/lib/services-data";

export type TendersBrowseFormState = {
  q: string;
  catalogPicks: CatalogFilterSelection[];
  city: string;
  sort: string;
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  blind: string;
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Նորերը առաջ" },
  { value: "ending", label: "Վերջնաժամկետը՝ շուտով" },
  { value: "budget_low", label: "Բյուջեն՝ ցածրից բարձր" },
  { value: "budget_high", label: "Բյուջեն՝ բարձրից ցածր" },
  { value: "bids_most", label: "Ամենաշատ առաջարկները" },
];

type Props = {
  categories: ServiceCategoryWithServices[];
  cities: string[];
  initial: TendersBrowseFormState;
};

export function TendersBrowseSidebar({
  categories,
  cities,
  initial,
}: Props) {
  const [sectorOpen, setSectorOpen] = useState(false);
  const [catalogPicks, setCatalogPicks] = useState<CatalogFilterSelection[]>(
    initial.catalogPicks,
  );

  const sectorSummary = useMemo(() => {
    if (catalogPicks.length === 0) return "Բոլոր ոլորտները";
    if (catalogPicks.length === 1) {
      const p = catalogPicks[0]!;
      return p.serviceTitle
        ? `${p.categoryTitle} · ${p.serviceTitle}`
        : `${p.categoryTitle} · ամբողջ ոլորտը`;
    }
    const first = catalogPicks[0]!;
    const rest = catalogPicks.length - 1;
    const short = first.serviceTitle
      ? `${first.categoryTitle} · ${first.serviceTitle}`
      : `${first.categoryTitle} · ամբողջ ոլորտը`;
    return `${short} և ևս ${rest}`;
  }, [catalogPicks]);

  return (
    <>
      <div className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <SlidersHorizontal className="size-4 shrink-0 text-amber-700" />
          <span className="text-sm font-black text-slate-900">Ֆիլտրեր</span>
        </div>

        <form method="get" action={ROUTES.tenders} className="mt-4 grid gap-5">
          {catalogPicks.length > 0 ? (
            <input
              type="hidden"
              name="picks"
              value={serializeCatalogPicks(catalogPicks)}
            />
          ) : null}

          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Ոլորտ / ծառայություն (մինչև {MAX_CATALOG_PICKS})
            </span>
            <button
              type="button"
              onClick={() => setSectorOpen(true)}
              className="group mt-2 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-left transition hover:border-slate-950 hover:bg-white"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-amber-400 group-hover:text-slate-950">
                  <Layers className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-amber-800">
                    Ընտրել ինչպես գրանցման էջում
                  </span>
                  <span className="mt-0.5 line-clamp-3 text-sm font-bold text-slate-800">
                    {sectorSummary}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:text-slate-950" />
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Բառային որոնում
            </span>
            <span className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                name="q"
                type="search"
                defaultValue={initial.q}
                placeholder="Վերնագիր, նկարագրություն…"
                maxLength={200}
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Բնակավայր
            </span>
            <input
              name="city"
              type="text"
              defaultValue={initial.city}
              list="tenders-browse-city-list"
              placeholder="Օր․՝ Երևան"
              maxLength={120}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-700"
            />
            <datalist id="tenders-browse-city-list">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </label>

          <div className="grid gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Բյուջե (֏)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="sr-only">Սկզբից</span>
                <input
                  name="budgetMin"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="Նվազագույն"
                  defaultValue={initial.budgetMin}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
                />
              </label>
              <label className="block">
                <span className="sr-only">Մինչև</span>
                <input
                  name="budgetMax"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="Առավելագույն"
                  defaultValue={initial.budgetMax}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
                />
              </label>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
              Ցուցադրվում են մրցույթներ, որոնց բյուջեի միջակայքը հատում է ընտրած
              սահմանները (եթե թողնեք դատարկ՝ չի զտվի)։
            </p>
          </div>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Վերջնաժամկետ
            </span>
            <select
              name="deadline"
              defaultValue={initial.deadline}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
            >
              <option value="">Ամբողջը (ակտիվ)</option>
              <option value="7">Հաջորդ 7 օրվա ընթացքում</option>
              <option value="14">Հաջորդ 14 օրվա ընթացքում</option>
              <option value="30">Հաջորդ 30 օրվա ընթացքում</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Առաջարկների տեսք
            </span>
            <select
              name="blind"
              defaultValue={initial.blind}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
            >
              <option value="">Ամբողջը</option>
              <option value="yes">Միայն փակ (blind)</option>
              <option value="no">Միայն բաց</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Տեսակավորում
            </span>
            <select
              name="sort"
              defaultValue={initial.sort}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value || "new"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="w-full rounded-full bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Ցուցադրել արդյունքները
            </button>
            <a
              href={ROUTES.tenders}
              className="block w-full rounded-full bg-slate-100 py-3.5 text-center text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Մաքրել բոլորը
            </a>
          </div>
        </form>
      </div>

      <TendersCatalogFilterModal
        open={sectorOpen}
        onClose={() => setSectorOpen(false)}
        categories={categories}
        initial={catalogPicks}
        onApply={(next) => {
          setCatalogPicks(next);
        }}
      />
    </>
  );
}
