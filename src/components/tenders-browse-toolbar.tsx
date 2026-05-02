import { Search, SlidersHorizontal } from "lucide-react";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { ROUTES } from "@/lib/routes";

export type TendersBrowseValues = {
  q: string;
  category: string;
  service: string;
  city: string;
  sort: string;
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Նորերը առաջ" },
  { value: "ending", label: "Վերջնաժամկետը՝ շուտով" },
  { value: "budget_low", label: "Բյուջեն՝ ցածրից բարձր" },
  { value: "budget_high", label: "Բյուջեն՝ բարձրից ցածր" },
];

type Props = {
  categories: ServiceCategoryWithServices[];
  cities: string[];
  initial: TendersBrowseValues;
};

export function TendersBrowseToolbar({
  categories,
  cities,
  initial,
}: Props) {
  return (
    <div className="mt-6 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-700">
        <SlidersHorizontal className="size-4 shrink-0 text-amber-700" />
        <span className="text-sm font-black">Որոնում և ֆիլտրեր</span>
      </div>

      <form method="get" action={ROUTES.tenders} className="grid gap-4">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Բառային որոնում
          </span>
          <span className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="size-5 shrink-0 text-slate-400" />
            <input
              name="q"
              type="search"
              defaultValue={initial.q}
              placeholder="Վերնագիր, նկարագրություն, ոլորտ, բնակավայր…"
              maxLength={200}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Ոլորտ
            </span>
            <select
              name="category"
              defaultValue={initial.category}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-amber-700/0 transition focus:ring-2 focus:ring-amber-700"
            >
              <option value="">Բոլոր ոլորտները</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.title}>
                  {cat.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Ծառայություն
            </span>
            <select
              name="service"
              defaultValue={initial.service}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
            >
              <option value="">Բոլոր ծառայությունները</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.title}>
                  {cat.services.map((svc) => (
                    <option key={svc.id} value={svc.title}>
                      {svc.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Բնակավայր
            </span>
            <input
              name="city"
              type="text"
              defaultValue={initial.city}
              list="tenders-city-options"
              placeholder="Օր․՝ Կենտրոն, Երևան"
              maxLength={120}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-700"
            />
            <datalist id="tenders-city-options">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Տեսակավորում
            </span>
            <select
              name="sort"
              defaultValue={initial.sort}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-700"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value || "new"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Կիրառել
          </button>
          <a
            href={ROUTES.tenders}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Մաքրել
          </a>
        </div>
      </form>
    </div>
  );
}
