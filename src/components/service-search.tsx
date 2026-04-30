"use client";

import { ArrowRight, Layers3, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { serviceCategories } from "@/lib/service-categories";

const searchableServices = serviceCategories.flatMap((category) =>
  category.services.map((service) => ({
    service,
    category: category.title,
  })),
);

function createTenderSearchHref(service: string) {
  if (!service.trim()) {
    return ROUTES.tenders;
  }

  return `${ROUTES.tenders}?service=${encodeURIComponent(service.trim())}`;
}

export function ServiceSearch() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("hy-AM");
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return searchableServices
      .filter(({ service }) => {
        const searchText = service.toLocaleLowerCase("hy-AM");

        return searchText.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery]);
  const shouldShowResults = normalizedQuery.length > 0;

  return (
    <div className="relative mt-4 w-full rounded-4xl bg-white p-2 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200 sm:mt-9">
      <div className="flex flex-col gap-2 sm:min-h-18 sm:flex-row">
        <div className="flex min-h-14 flex-1 items-center gap-3 rounded-3xl bg-slate-50 px-4 ring-1 ring-slate-200 sm:min-h-0 sm:rounded-full sm:px-5">
          <Search className="size-5 shrink-0 text-slate-400 sm:size-6" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ի՞նչ աշխատանք եք փնտրում, օրինակ՝ սանտեխնիկա"
            className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 sm:text-base"
          />
        </div>
        <Link
          href={createTenderSearchHref(query)}
          className="group inline-flex items-center justify-center gap-3 rounded-3xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:rounded-full sm:px-8 sm:py-5 sm:text-base"
        >
          Գտնել մրցույթներ
          <ArrowRight className="size-5 transition group-hover:translate-x-1" />
        </Link>
      </div>

      {shouldShowResults ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-3 max-h-[70vh] overflow-y-auto rounded-4xl bg-white p-2 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200 sm:p-3">
          {results.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map(({ service, category }) => (
                <Link
                  key={`${category}-${service}`}
                  href={createTenderSearchHref(service)}
                  className="group flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:ring-amber-100 sm:gap-4 sm:p-4"
                  onClick={() => setQuery(service)}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-white text-amber-700 ring-1 ring-slate-200">
                      <Layers3 className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-slate-950">
                        {service}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {category}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-700" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 p-5 text-center ring-1 ring-slate-100">
              <p className="text-sm font-black text-slate-950">
                Այդ անունով աշխատանք չգտանք
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Փորձեք գրել ավելի ընդհանուր ոլորտ կամ բացեք բոլոր ակտիվ
                մրցույթները։
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
