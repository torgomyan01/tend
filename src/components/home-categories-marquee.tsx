import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import type { ServiceCategoryWithServices } from "@/lib/services-data";

type Props = {
  categories: ServiceCategoryWithServices[];
};

function categoryHref(title: string) {
  return `${ROUTES.tenders}?service=${encodeURIComponent(title)}`;
}

function CategoryChip({
  category,
}: {
  category: ServiceCategoryWithServices;
}) {
  const count = category.services.length;
  return (
    <Link
      href={categoryHref(category.title)}
      className="group inline-flex shrink-0 items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-5 py-3 text-sm font-black text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-300 hover:text-slate-950 hover:shadow-lg"
    >
      <span className="grid size-8 place-items-center rounded-full bg-amber-200/80 text-amber-900 text-base font-black ring-1 ring-amber-300/60">
        {category.title.charAt(0)}
      </span>
      <span className="whitespace-nowrap">{category.title}</span>
      {count > 0 ? (
        <span className="text-xs font-bold text-slate-500">
          {count} ծառայություն
        </span>
      ) : null}
      <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-amber-700" />
    </Link>
  );
}

export function HomeCategoriesMarquee({ categories }: Props) {
  if (categories.length === 0) {
    return null;
  }

  const loop = [...categories, ...categories];

  return (
    <section
      aria-label="Բոլոր ոլորտները"
      className="relative w-full overflow-hidden border-y border-slate-200/70 bg-linear-to-b from-white via-[#fbf7ef] to-white py-8 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-[#f7f4ee] to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-[#f7f4ee] to-transparent sm:w-40" />

      <div className="mx-auto mb-5 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              Ոլորտներ
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Հարյուրավոր ծառայություններ՝ մեկ հարթակում
            </h2>
          </div>
          <Link
            href={ROUTES.categories}
            className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-400 hover:text-slate-950 sm:inline-flex"
          >
            Տեսնել բոլորը
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="relative flex w-full">
        <div className="tend-marquee-track flex shrink-0 items-center gap-3 pr-3">
          {loop.map((category, index) => (
            <CategoryChip
              key={`${category.id}-${index}`}
              category={category}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
