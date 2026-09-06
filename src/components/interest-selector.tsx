"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  Plus,
  Search,
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
  /**
   * Կարգավորումների էջ՝ որոնում/ընտրված բլոկը չի ցուցադրվում, միայն մոդալի մուտք։
   * Ընտրանքը ցուցադրում եք ծնող կոմպոնենտում։
   */
  compact?: boolean;
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
  compact = false,
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

  const modalTriggerButton = (
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
            {compact
              ? selected.length > 0
                ? "Ավելացնել կամ խմբագրել ոլորտները"
                : "Ընտրել ոլորտներ"
              : "Ընտրել ծառայություններ"}
          </span>
          <span className="block text-xs font-semibold text-slate-500">
            {categories.length} ոլորտ ・ {totalServices}+ ծառայություն
            {compact && selected.length > 0
              ? ` · ընթացիկ՝ ${selected.length}`
              : ""}
          </span>
        </span>
      </span>
      <ChevronRight className="size-5 text-slate-400 transition group-hover:text-slate-950" />
    </button>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {modalTriggerButton}
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

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-200/70 text-amber-800">
            <Layers className="size-5" />
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

      {modalTriggerButton}

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
  const [query, setQuery] = useState("");
  const [activeCategoryTitle, setActiveCategoryTitle] = useState<string>(
    categories[0]?.title ?? "",
  );
  const [mobileView, setMobileView] = useState<"categories" | "services">(
    "categories",
  );

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery("");
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

  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const results: InterestSelection[] = [];
    for (const category of categories) {
      for (const service of category.services) {
        if (service.title.toLowerCase().includes(normalizedQuery)) {
          results.push({ category: category.title, service: service.title });
          if (results.length >= 100) return results;
        }
      }
    }
    return results;
  }, [categories, normalizedQuery]);

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
    if (!activeCategory) return;
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
    if (!activeCategory) return;
    setDraft(
      draft.filter((interest) => interest.category !== activeCategory.title),
    );
  }

  if (!open || !activeCategory) {
    return null;
  }

  const isSearching = normalizedQuery.length > 0;
  const activeCategoryCount = draftCounts.get(activeCategory.title) ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[94vh] w-full flex-col overflow-hidden rounded-t-4xl bg-white shadow-2xl ring-1 ring-slate-200 sm:h-[90vh] sm:max-h-[1200px] sm:max-w-8xl sm:rounded-4xl">
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 sm:px-6 sm:pt-5 sm:pb-4">
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
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Հետաքրքրություններ
              </p>
              <h2 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-xl">
                Ընտրեք ձեր ծառայությունները
              </h2>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black sm:px-4 sm:py-2 ${
              draft.length > 0
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Check
              className={`size-3.5 ${
                draft.length > 0 ? "text-amber-300" : "text-slate-400"
              }`}
            />
            {draft.length}
          </span>
        </header>

        <div className="px-4 pb-3 sm:px-6 sm:pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Որոնել ծառայություն…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white sm:py-3"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
                aria-label="Մաքրել որոնումը"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {!isSearching && draft.length > 0 ? (
            <div className="mt-3 -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1 pb-1">
              {draft.map((interest) => (
                <button
                  key={`${interest.category}::${interest.service}`}
                  type="button"
                  onClick={() =>
                    toggleDraft(interest.category, interest.service)
                  }
                  title={`${interest.category} / ${interest.service}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-200"
                >
                  <span className="max-w-[180px] truncate">
                    {interest.service}
                  </span>
                  <X className="size-3.5 shrink-0 text-amber-700" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraft([])}
                className="inline-flex shrink-0 items-center rounded-full px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"
              >
                Մաքրել բոլորը
              </button>
            </div>
          ) : null}
        </div>

        {isSearching ? (
          <div className="flex-1 overflow-y-auto border-t border-slate-200 px-4 py-4 sm:px-6">
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Search className="size-6" />
                </div>
                <p className="mt-4 text-sm font-black text-slate-700">
                  «{query}» հարցումով ոչինչ չի գտնվել
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Փորձեք այլ բառով կամ ընտրեք ոլորտից։
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {searchResults.map((result) => {
                  const active = isInDraft(result.category, result.service);
                  return (
                    <li key={`${result.category}::${result.service}`}>
                      <button
                        type="button"
                        onClick={() =>
                          toggleDraft(result.category, result.service)
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                          active
                            ? "bg-slate-950 text-white"
                            : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {result.service}
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-[11px] font-semibold ${
                              active ? "text-amber-300" : "text-slate-500"
                            }`}
                          >
                            {result.category}
                          </span>
                        </span>
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full ${
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden border-t border-slate-200">
            <aside
              className={`${
                mobileView === "categories" ? "flex" : "hidden"
              } w-full flex-col overflow-x-hidden md:flex md:w-72 md:border-r md:border-slate-200 lg:w-80`}
            >
              <ul className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
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
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition md:px-3 md:py-2.5 ${
                          isActive
                            ? "bg-slate-950 text-white shadow-sm"
                            : "bg-white ring-1 ring-slate-200 hover:bg-slate-50 md:bg-transparent md:ring-0 md:hover:bg-white md:hover:shadow-sm"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black sm:text-base md:text-sm">
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
                        <span className="flex shrink-0 items-center gap-2">
                          {count > 0 ? (
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-black ${
                                isActive
                                  ? "bg-amber-300 text-slate-950"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {count}
                            </span>
                          ) : null}
                          <ChevronRight
                            className={`size-4 ${
                              isActive ? "text-white" : "text-slate-400"
                            } md:hidden`}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <main
              className={`${
                mobileView === "services" ? "flex" : "hidden"
              } flex-1 flex-col overflow-x-hidden md:flex`}
            >
              <div className="sticky top-0 z-1 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileView("categories")}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 md:hidden"
                    aria-label="Հետ"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">
                      {activeCategory.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                      {activeCategoryCount > 0
                        ? `Ընտրված՝ ${activeCategoryCount} / ${activeCategory.services.length}`
                        : `${activeCategory.services.length} ծառայություն`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:justify-end">
                  <button
                    type="button"
                    onClick={selectAllInActive}
                    className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Բոլորը
                  </button>
                  {activeCategoryCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearActive}
                      className="whitespace-nowrap rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                    >
                      Մաքրել
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5">
                <div className="grid gap-2 sm:grid-cols-2">
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
                          toggleDraft(activeCategory.title, service.title)
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0 truncate">
                          {service.title}
                        </span>
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full ${
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
                  })}
                </div>
              </div>
            </main>
          </div>
        )}

        <footer
          className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="flex w-full items-center justify-between gap-3 rounded-full bg-slate-950 px-5 py-4 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 sm:px-6"
          >
            <span>Հաստատել ընտրությունը</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-slate-950">
              {draft.length}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
