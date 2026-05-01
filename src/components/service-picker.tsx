"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ServiceCategoryWithServices } from "@/lib/services-data";

export type ServiceSelection = {
  category: string;
  service: string;
};

export function selectionKey(item: ServiceSelection) {
  return `${item.category}::${item.service}`;
}

type ServicePickerSingleProps = {
  mode?: "single";
  categories: ServiceCategoryWithServices[];
  value: ServiceSelection | null;
  onChange: (value: ServiceSelection) => void;
  placeholder?: string;
};

type ServicePickerMultiProps = {
  mode: "multi";
  categories: ServiceCategoryWithServices[];
  values: ServiceSelection[];
  onValuesChange: (values: ServiceSelection[]) => void;
  maxSelections?: number;
  placeholder?: string;
};

export type ServicePickerProps = ServicePickerSingleProps | ServicePickerMultiProps;

export function ServicePicker(props: ServicePickerProps) {
  if (props.mode === "multi") {
    return <ServicePickerMulti {...props} />;
  }
  return <ServicePickerSingle {...props} />;
}

function ServicePickerSingle({
  categories,
  value,
  onChange,
  placeholder = "Ընտրեք ծառայությունը",
}: ServicePickerSingleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItems = value ? [value] : [];

  function handleItemActivate(item: ServiceSelection) {
    onChange(item);
    setIsOpen(false);
  }

  return (
    <>
      <PickerTriggerButton
        selectedItems={selectedItems}
        maxSelections={1}
        selectionMode="single"
        placeholder={placeholder}
        onOpen={() => setIsOpen(true)}
      />

      {isOpen ? (
        <ServicePickerModal
          categories={categories}
          selectionMode="single"
          selectedItems={selectedItems}
          maxSelections={1}
          onClose={() => setIsOpen(false)}
          onItemActivate={handleItemActivate}
        />
      ) : null}
    </>
  );
}

function ServicePickerMulti({
  categories,
  values,
  onValuesChange,
  maxSelections = 5,
  placeholder = "Ընտրեք ծառայությունները",
}: ServicePickerMultiProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleItemActivate(item: ServiceSelection) {
    const key = selectionKey(item);
    const exists = values.some((entry) => selectionKey(entry) === key);
    if (exists) {
      onValuesChange(values.filter((entry) => selectionKey(entry) !== key));
      return;
    }
    if (values.length >= maxSelections) {
      return;
    }
    onValuesChange([...values, item]);
  }

  return (
    <>
      <PickerTriggerButton
        selectedItems={values}
        maxSelections={maxSelections}
        selectionMode="multi"
        placeholder={placeholder}
        onOpen={() => setIsOpen(true)}
      />

      {isOpen ? (
        <ServicePickerModal
          categories={categories}
          selectionMode="multi"
          selectedItems={values}
          maxSelections={maxSelections}
          onClose={() => setIsOpen(false)}
          onItemActivate={handleItemActivate}
        />
      ) : null}
    </>
  );
}

function PickerTriggerButton({
  selectedItems,
  maxSelections,
  selectionMode,
  placeholder,
  onOpen,
}: {
  selectedItems: ServiceSelection[];
  maxSelections: number;
  selectionMode: "single" | "multi";
  placeholder: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-950 hover:shadow-lg sm:p-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-amber-400 group-hover:text-slate-950">
          <Layers className="size-5" />
        </span>
        <span className="min-w-0">
          {selectedItems.length > 0 ? (
            <>
              <span className="block truncate text-base font-black text-slate-950">
                {selectionMode === "multi"
                  ? `Ընտրված՝ ${selectedItems.length}/${maxSelections}`
                  : selectedItems[0].service}
              </span>
              <span className="block truncate text-xs font-semibold text-slate-500">
                {selectionMode === "multi"
                  ? selectedItems.map((entry: ServiceSelection) => entry.service).join(" · ")
                  : selectedItems[0].category}
              </span>
            </>
          ) : (
            <>
              <span className="block text-base font-black text-slate-950">{placeholder}</span>
              <span className="block text-xs font-semibold text-slate-500">
                {selectionMode === "multi"
                  ? `Մինչև ${maxSelections} ծառայություն`
                  : "Ընտրեք ցանկից կամ որոնեք"}
              </span>
            </>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:text-slate-950" />
    </button>
  );
}

type ServicePickerModalProps = {
  categories: ServiceCategoryWithServices[];
  selectionMode: "single" | "multi";
  selectedItems: ServiceSelection[];
  maxSelections: number;
  onClose: () => void;
  onItemActivate: (selection: ServiceSelection) => void;
};

function ServicePickerModal({
  categories,
  selectionMode,
  selectedItems,
  maxSelections,
  onClose,
  onItemActivate,
}: ServicePickerModalProps) {
  const selectedKeys = useMemo(
    () => new Set(selectedItems.map(selectionKey)),
    [selectedItems],
  );

  const firstSelected = selectedItems[0];
  const [query, setQuery] = useState("");
  const [activeCategoryTitle, setActiveCategoryTitle] = useState<string>(
    firstSelected?.category ?? categories[0]?.title ?? "",
  );
  const [mobileView, setMobileView] = useState<"categories" | "services">(
    "categories",
  );

  useEffect(() => {
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
  }, [onClose]);

  const normalizedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: ServiceSelection[] = [];
    for (const category of categories) {
      for (const service of category.services) {
        if (service.title.toLowerCase().includes(normalizedQuery)) {
          results.push({ category: category.title, service: service.title });
          if (results.length >= 60) {
            return results;
          }
        }
      }
    }
    return results;
  }, [normalizedQuery, categories]);

  const activeCategory = useMemo(
    () =>
      categories.find((category) => category.title === activeCategoryTitle) ??
      categories[0],
    [activeCategoryTitle, categories],
  );

  if (!activeCategory) {
    return null;
  }

  const multiTitle =
    selectionMode === "multi"
      ? `Ընտրեք մինչև ${maxSelections} ծառայություն`
      : "Ընտրեք ծառայությունը";

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
              Ծառայություն
            </p>
            <h2 className="truncate text-lg font-black text-slate-950 sm:text-xl">
              {multiTitle}
            </h2>
            {selectionMode === "multi" ? (
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                Սեղմեք ընտրելու/հանելու համար · {selectedItems.length}/
                {maxSelections}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Որոնել ծառայություն"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
          />
        </div>
      </div>

      {normalizedQuery ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {searchResults.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                «{query}» հարցումով ոչինչ չի գտնվել։
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {searchResults.map((result) => {
                  const key = selectionKey(result);
                  const isSelected = selectedKeys.has(key);
                  const atCap =
                    selectionMode === "multi" &&
                    !isSelected &&
                    selectedItems.length >= maxSelections;

                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={atCap}
                        onClick={() => onItemActivate(result)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "bg-slate-950 text-white ring-slate-950"
                            : "bg-white text-slate-900 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {result.service}
                          </span>
                          <span
                            className={`block truncate text-xs font-semibold ${
                              isSelected ? "text-amber-300" : "text-slate-500"
                            }`}
                          >
                            {result.category}
                          </span>
                        </span>
                        {isSelected ? (
                          <Check className="size-4 shrink-0 text-amber-300" />
                        ) : (
                          <Sparkles className="size-4 shrink-0 opacity-60" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selectionMode === "multi" ? (
            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Պահել ընտրությունը
              </button>
            </footer>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="flex min-h-0 flex-1 overflow-hidden">
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
                  return (
                    <li key={category.id}>
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
                        <ChevronRight
                          className={`size-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-400"
                          } md:hidden`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <main
              className={`${
                mobileView === "services" ? "flex" : "hidden"
              } min-h-0 flex-1 flex-col overflow-hidden md:flex`}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
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
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {activeCategory.services.map((service) => {
                    const item: ServiceSelection = {
                      category: activeCategory.title,
                      service: service.title,
                    };
                    const key = selectionKey(item);
                    const isSelected = selectedKeys.has(key);
                    const atCap =
                      selectionMode === "multi" &&
                      !isSelected &&
                      selectedItems.length >= maxSelections;

                    return (
                      <li key={service.id}>
                        <button
                          type="button"
                          disabled={atCap}
                          onClick={() => onItemActivate(item)}
                          className={`flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-sm font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isSelected
                              ? "bg-slate-950 text-white ring-slate-950"
                              : "bg-white text-slate-800 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                          }`}
                        >
                          <span className="min-w-0 truncate">{service.title}</span>
                          {isSelected ? (
                            <Check className="size-4 shrink-0 text-amber-300" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </main>
          </div>

          {selectionMode === "multi" ? (
            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 sm:px-6 md:border-l md:border-t-0 md:py-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-slate-800 md:w-auto md:min-w-[200px]"
              >
                Պահել ընտրությունը ({selectedItems.length}/{maxSelections})
              </button>
            </footer>
          ) : null}
        </div>
      )}
    </div>
  );
}
