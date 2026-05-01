"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ServiceCategoryWithServices } from "@/lib/services-data";

export type InterestSelection = {
  category: string;
  service: string;
};

type InterestSelectorProps = {
  selected: InterestSelection[];
  onChange: (next: InterestSelection[]) => void;
  categories: ServiceCategoryWithServices[];
};

function isSameInterest(a: InterestSelection, b: InterestSelection) {
  return a.category === b.category && a.service === b.service;
}

function countByCategory(selected: InterestSelection[]) {
  const map = new Map<string, number>();
  for (const interest of selected) {
    map.set(interest.category, (map.get(interest.category) ?? 0) + 1);
  }
  return map;
}

export function InterestSelector({
  selected,
  onChange,
  categories,
}: InterestSelectorProps) {
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const totalServices = useMemo(
    () => categories.reduce((sum, category) => sum + category.services.length, 0),
    [categories],
  );

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: InterestSelection[] = [];
    for (const category of categories) {
      for (const service of category.services) {
        if (service.title.toLowerCase().includes(normalizedQuery)) {
          results.push({ category: category.title, service: service.title });
          if (results.length >= 40) {
            return results;
          }
        }
      }
    }
    return results;
  }, [normalizedQuery, categories]);

  function toggleService(category: string, service: string) {
    const target = { category, service };
    const isAlreadySelected = selected.some((interest) =>
      isSameInterest(interest, target),
    );

    if (isAlreadySelected) {
      onChange(selected.filter((interest) => !isSameInterest(interest, target)));
    } else {
      onChange([...selected, target]);
    }
  }

  function isSelected(category: string, service: string) {
    return selected.some((interest) =>
      isSameInterest(interest, { category, service }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-200/70 text-amber-800">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black text-amber-900">
              Ինչո՞վ եք հետաքրքրվում
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-900/80">
              Ընտրեք այն ծառայությունները, որոնցով հետաքրքրված եք։
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Որոնել ծառայություն (օր.՝ ծրագրավորում, սանտեխնիկա)"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
        />
      </div>

      {normalizedQuery ? (
        <div className="max-h-80 overflow-y-auto rounded-3xl bg-white p-1.5 ring-1 ring-slate-200">
          {searchResults.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm font-semibold text-slate-500">
              «{query}» հարցումով ոչինչ չի գտնվել։
            </p>
          ) : (
            searchResults.map((result) => {
              const active = isSelected(result.category, result.service);
              return (
                <button
                  key={`${result.category}::${result.service}`}
                  type="button"
                  onClick={() => toggleService(result.category, result.service)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {result.service}
                    </span>
                    <span
                      className={`block truncate text-xs font-semibold ${
                        active ? "text-amber-300" : "text-slate-500"
                      }`}
                    >
                      {result.category}
                    </span>
                  </span>
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full ${
                      active
                        ? "bg-amber-300 text-slate-950"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {active ? (
                      <Check className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="rounded-3xl bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Ընտրված ({selected.length})
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-black text-slate-300 transition hover:text-white"
            >
              Մաքրել
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((interest) => (
              <button
                key={`${interest.category}::${interest.service}`}
                type="button"
                onClick={() => toggleService(interest.category, interest.service)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-amber-200"
              >
                {interest.service}
                <X className="size-3" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-950 hover:shadow-lg"
      >
        <span className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-amber-400 group-hover:text-slate-950">
            <Layers className="size-5" />
          </span>
          <span>
            <span className="block text-base font-black text-slate-950">
              Ընտրել ծառայություններ
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              {categories.length} ոլորտ ・ {totalServices}+ ծառայություն
            </span>
          </span>
        </span>
        <ChevronRight className="size-5 text-slate-400 transition group-hover:text-slate-950" />
      </button>

      <InterestModal
        open={isModalOpen}
        selected={selected}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onConfirm={(next) => {
          onChange(next);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

type InterestModalProps = {
  open: boolean;
  onClose: () => void;
  selected: InterestSelection[];
  onConfirm: (next: InterestSelection[]) => void;
  categories: ServiceCategoryWithServices[];
};

function InterestModal({
  open,
  onClose,
  selected,
  onConfirm,
  categories,
}: InterestModalProps) {
  const [draft, setDraft] = useState<InterestSelection[]>(selected);
  const [activeCategoryTitle, setActiveCategoryTitle] = useState<string>(
    categories[0]?.title ?? "",
  );
  const [mobileView, setMobileView] = useState<"categories" | "services">(
    "categories",
  );

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setMobileView("categories");
    }
  }, [open, selected]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const draftCounts = useMemo(() => countByCategory(draft), [draft]);
  const activeCategory = useMemo(
    () =>
      categories.find((category) => category.title === activeCategoryTitle) ??
      categories[0],
    [activeCategoryTitle, categories],
  );

  function isInDraft(category: string, service: string) {
    return draft.some((interest) =>
      isSameInterest(interest, { category, service }),
    );
  }

  function toggleDraft(category: string, service: string) {
    const target = { category, service };
    const isAlreadySelected = draft.some((interest) =>
      isSameInterest(interest, target),
    );

    if (isAlreadySelected) {
      setDraft(draft.filter((interest) => !isSameInterest(interest, target)));
    } else {
      setDraft([...draft, target]);
    }
  }

  function selectAllInActive() {
    if (!activeCategory) {
      return;
    }
    const next = [...draft];
    for (const service of activeCategory.services) {
      const target = { category: activeCategory.title, service: service.title };
      const exists = next.some((interest) => isSameInterest(interest, target));
      if (!exists) {
        next.push(target);
      }
    }
    setDraft(next);
  }

  function clearActive() {
    if (!activeCategory) {
      return;
    }
    setDraft(
      draft.filter((interest) => interest.category !== activeCategory.title),
    );
  }

  if (!open || !activeCategory) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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
              Հետաքրքրություններ
            </p>
            <h2 className="truncate text-lg font-black text-slate-950 sm:text-xl">
              Ընտրել ծառայություններ
            </h2>
          </div>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
          {draft.length} ընտրված
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`${
            mobileView === "categories" ? "flex" : "hidden"
          } w-full flex-col border-r border-slate-200 bg-slate-50/40 md:flex md:w-80`}
        >
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Կատեգորիաներ ({categories.length})
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
                      setActiveCategoryTitle(category.title);
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
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllInActive}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
              >
                Բոլորը
              </button>
              {(draftCounts.get(activeCategory.title) ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={clearActive}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                >
                  Մաքրել
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {activeCategory.services.map((service) => {
                const active = isInDraft(activeCategory.title, service.title);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() =>
                      toggleDraft(activeCategory.title, service.title)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
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

      <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
        >
          Չեղարկել
        </button>
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
            {draft.length} ընտրված ծառայություն
          </span>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
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
