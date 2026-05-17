"use client";

import {
  ChevronRight,
  Layers,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type BrowseFiltersFormProps = {
  formId: string;
  cities: string[];
  initial: TendersBrowseFormState;
  catalogPicks: CatalogFilterSelection[];
  onOpenSector: () => void;
  datalistId?: string;
};

function countActiveFilters(initial: TendersBrowseFormState): number {
  let count = 0;
  if (initial.q.trim()) count += 1;
  if (initial.catalogPicks.length > 0) count += 1;
  if (initial.city.trim()) count += 1;
  if (initial.budgetMin.trim() || initial.budgetMax.trim()) count += 1;
  if (initial.deadline) count += 1;
  if (initial.blind) count += 1;
  if (initial.sort) count += 1;
  return count;
}

function sectorSummaryFrom(catalogPicks: CatalogFilterSelection[]): string {
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
}

function BrowseFiltersForm({
  formId,
  cities,
  initial,
  catalogPicks,
  onOpenSector,
  datalistId = "tenders-browse-city-list",
}: BrowseFiltersFormProps) {
  const sectorSummary = useMemo(
    () => sectorSummaryFrom(catalogPicks),
    [catalogPicks],
  );

  return (
    <form id={formId} method="get" action={ROUTES.tenders} className="grid gap-5">
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
          onClick={onOpenSector}
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
          list={datalistId}
          placeholder="Օր․՝ Երևան"
          maxLength={120}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-700"
        />
        <datalist id={datalistId}>
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
            <span className="sr-only">Նվազագույն</span>
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
            <span className="sr-only">Առավելագույն</span>
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
    </form>
  );
}

type SharedProps = {
  categories: ServiceCategoryWithServices[];
  cities: string[];
  initial: TendersBrowseFormState;
};

function useBrowseFilterState(initial: TendersBrowseFormState) {
  const [sectorOpen, setSectorOpen] = useState(false);
  const [catalogPicks, setCatalogPicks] = useState<CatalogFilterSelection[]>(
    initial.catalogPicks,
  );

  useEffect(() => {
    setCatalogPicks(initial.catalogPicks);
  }, [initial.catalogPicks]);

  return {
    sectorOpen,
    setSectorOpen,
    catalogPicks,
    setCatalogPicks,
  };
}

/** Desktop sidebar — lg+ */
export function TendersBrowseSidebar({
  categories,
  cities,
  initial,
}: SharedProps) {
  const { sectorOpen, setSectorOpen, catalogPicks, setCatalogPicks } =
    useBrowseFilterState(initial);

  return (
    <>
      <div className="hidden rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:block">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <SlidersHorizontal className="size-4 shrink-0 text-amber-700" />
          <span className="text-sm font-black text-slate-900">Ֆիլտրեր</span>
        </div>

        <div className="mt-4">
          <BrowseFiltersForm
            formId="tenders-browse-filters-desktop"
            cities={cities}
            initial={initial}
            catalogPicks={catalogPicks}
            onOpenSector={() => setSectorOpen(true)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            form="tenders-browse-filters-desktop"
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
      </div>

      <TendersCatalogFilterModal
        open={sectorOpen}
        onClose={() => setSectorOpen(false)}
        categories={categories}
        initial={catalogPicks}
        onApply={(next) => setCatalogPicks(next)}
      />
    </>
  );
}

/** Mobile — կոճակ + ամբողջ էկրանի մոդալ */
export function TendersBrowseMobileFilters({
  categories,
  cities,
  initial,
}: SharedProps) {
  const [open, setOpen] = useState(false);
  const { sectorOpen, setSectorOpen, catalogPicks, setCatalogPicks } =
    useBrowseFilterState(initial);
  const activeCount = countActiveFilters(initial);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 lg:hidden"
      >
        <SlidersHorizontal className="size-4 text-amber-700" />
        Ֆիլտրեր
        {activeCount > 0 ? (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-black text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#f7f4ee] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Մրցույթների ֆիլտրեր"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-5 text-amber-700" />
              <h2 className="text-lg font-black text-slate-950">Ֆիլտրեր</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Փակել"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
              <BrowseFiltersForm
                formId="tenders-browse-filters-mobile"
                cities={cities}
                initial={initial}
                catalogPicks={catalogPicks}
                onOpenSector={() => setSectorOpen(true)}
                datalistId="tenders-browse-city-list-mobile"
              />
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="grid gap-2">
              <button
                type="submit"
                form="tenders-browse-filters-mobile"
                className="w-full rounded-full bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Հաստատել
              </button>
              <a
                href={ROUTES.tenders}
                className="block w-full rounded-full bg-slate-100 py-3.5 text-center text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Մաքրել բոլորը
              </a>
            </div>
          </footer>
        </div>
      ) : null}

      <TendersCatalogFilterModal
        open={sectorOpen}
        onClose={() => setSectorOpen(false)}
        categories={categories}
        initial={catalogPicks}
        onApply={(next) => setCatalogPicks(next)}
      />
    </>
  );
}
