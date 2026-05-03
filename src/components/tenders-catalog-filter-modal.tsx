"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import {
  MAX_CATALOG_PICKS,
  type CatalogFilterSelection,
} from "@/lib/tenders-catalog-picks";

function pickKey(p: CatalogFilterSelection) {
  return `${p.categoryTitle}::${p.serviceTitle ?? ""}`;
}

function countByCategory(draft: CatalogFilterSelection[]) {
  const map = new Map<string, number>();
  for (const p of draft) {
    map.set(p.categoryTitle, (map.get(p.categoryTitle) ?? 0) + 1);
  }
  return map;
}

type Props = {
  open: boolean;
  onClose: () => void;
  categories: ServiceCategoryWithServices[];
  initial: CatalogFilterSelection[];
  onApply: (value: CatalogFilterSelection[]) => void;
};

export function TendersCatalogFilterModal({
  open,
  onClose,
  categories,
  initial,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<CatalogFilterSelection[]>([]);
  const [draftCategory, setDraftCategory] = useState<string>(
    categories[0]?.title ?? "",
  );
  const [mobileView, setMobileView] = useState<"categories" | "services">(
    "categories",
  );

  useEffect(() => {
    if (!open) return;
    setDraft(initial.slice(0, MAX_CATALOG_PICKS));
    const firstCat =
      initial[0]?.categoryTitle &&
      categories.some((c) => c.title === initial[0].categoryTitle)
        ? initial[0].categoryTitle
        : categories[0]?.title ?? "";
    setDraftCategory(firstCat);
    setMobileView("categories");
  }, [open, initial, categories]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const activeCategory = useMemo(
    () =>
      categories.find((c) => c.title === draftCategory) ?? categories[0],
    [categories, draftCategory],
  );

  const draftCounts = useMemo(() => countByCategory(draft), [draft]);

  function isInDraft(categoryTitle: string, serviceTitle: string) {
    return draft.some(
      (p) =>
        p.categoryTitle === categoryTitle && p.serviceTitle === serviceTitle,
    );
  }

  function isCategoryOnlyInDraft(categoryTitle: string) {
    return draft.some(
      (p) => p.categoryTitle === categoryTitle && p.serviceTitle == null,
    );
  }

  function toggleService(categoryTitle: string, serviceTitle: string) {
    const key = pickKey({ categoryTitle, serviceTitle });
    const exists = draft.some((p) => pickKey(p) === key);
    if (exists) {
      setDraft(draft.filter((p) => pickKey(p) !== key));
      return;
    }
    if (draft.length >= MAX_CATALOG_PICKS) return;
    setDraft([...draft, { categoryTitle, serviceTitle }]);
  }

  function addCategoryOnly(categoryTitle: string) {
    const key = pickKey({ categoryTitle, serviceTitle: null });
    const exists = draft.some((p) => pickKey(p) === key);
    if (exists) {
      setDraft(draft.filter((p) => pickKey(p) !== key));
      return;
    }
    if (draft.length >= MAX_CATALOG_PICKS) return;
    setDraft([...draft, { categoryTitle, serviceTitle: null }]);
  }

  function removePick(p: CatalogFilterSelection) {
    setDraft(draft.filter((x) => pickKey(x) !== pickKey(p)));
  }

  function clearAll() {
    setDraft([]);
  }

  function confirm() {
    onApply(draft);
    onClose();
  }

  if (!open || !activeCategory) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label="Փակել"
          >
            <X className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Ֆիլտր
            </p>
            <h2 className="truncate text-lg font-black text-slate-950 sm:text-xl">
              Ոլորտներ և ծառայություններ
            </h2>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
          {draft.length} / {MAX_CATALOG_PICKS}
        </span>
      </header>

      {draft.length > 0 ? (
        <div className="max-h-32 overflow-y-auto border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Ընտրված
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-black text-rose-700 transition hover:underline"
            >
              Մաքրել բոլորը
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.map((p) => (
              <button
                key={pickKey(p)}
                type="button"
                onClick={() => removePick(p)}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-left text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:ring-rose-200"
              >
                <span className="truncate">
                  {p.serviceTitle
                    ? `${p.categoryTitle} · ${p.serviceTitle}`
                    : `${p.categoryTitle} · ամբողջ ոլորտը`}
                </span>
                <X className="size-3 shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`${
            mobileView === "categories" ? "flex" : "hidden"
          } w-full flex-col border-r border-slate-200 bg-slate-50/40 md:flex md:w-80`}
        >
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Ոլորտներ ({categories.length})
            </p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {categories.map((category) => {
              const isActive = activeCategory.title === category.title;
              const count = draftCounts.get(category.title) ?? 0;
              return (
                <li key={category.title}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCategory(category.title);
                      setMobileView("services");
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {category.title}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] font-semibold ${
                          isActive ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {category.services.length} ծառայություն
                      </span>
                    </span>
                    {count > 0 ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${
                          isActive
                            ? "bg-amber-300 text-slate-950"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {count}
                      </span>
                    ) : (
                      <ChevronRight
                        className={`size-4 shrink-0 ${
                          isActive ? "text-white" : "text-slate-400"
                        } md:hidden`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main
          className={`${
            mobileView === "services" ? "flex" : "hidden"
          } flex-1 flex-col md:flex`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                onClick={() => setMobileView("categories")}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 md:hidden"
                aria-label="Հետ"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">
                  {activeCategory.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500 sm:text-sm">
                  {activeCategory.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => addCategoryOnly(activeCategory.title)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                  isCategoryOnlyInDraft(activeCategory.title)
                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isCategoryOnlyInDraft(activeCategory.title)
                  ? "Հանել ոլորտը"
                  : "Ամբողջ ոլորտը"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <p className="mb-3 text-xs font-semibold text-slate-500">
              Սեղմեք ծառայություններին՝ մինչև {MAX_CATALOG_PICKS} զուգակցություն։
              «Ամբողջ ոլորտը»՝ միայն ոլորտով ֆիլտր։
            </p>
            <div className="flex flex-wrap gap-2">
              {activeCategory.services.map((service) => {
                const active = isInDraft(
                  activeCategory.title,
                  service.title,
                );
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() =>
                      toggleService(activeCategory.title, service.title)
                    }
                    disabled={
                      !active &&
                      draft.length >= MAX_CATALOG_PICKS
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    }`}
                  >
                    {active ? <Check className="size-3.5" /> : null}
                    {service.title}
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <footer className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
        >
          Չեղարկել
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
            <Layers className="mr-1 inline size-3.5 align-text-bottom text-amber-700" />
            {draft.length} ընտրություն
          </span>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
          >
            Հաստատել
            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-950">
              {draft.length}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export type { CatalogFilterSelection } from "@/lib/tenders-catalog-picks";
