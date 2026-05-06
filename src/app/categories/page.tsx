import { ArrowRight, Layers3, Sparkles } from "lucide-react";
import Link from "next/link";
import { ServiceSearch } from "@/components/service-search";
import { SiteHeader } from "@/components/site-header";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getServiceCategories();
  const totalServices = categories.reduce(
    (sum, category) => sum + category.services.length,
    0,
  );

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
          <div className="flex justify-end">
          <Link
            href={ROUTES.createTender}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-fit"
          >
            Տեղադրել մրցույթ
            <ArrowRight className="size-4" />
          </Link>
          </div>

        <section className="relative overflow-hidden rounded-4xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 sm:p-10 lg:p-12">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-amber-200 ring-1 ring-white/10 sm:text-sm">
                <Sparkles className="size-4" />
                Մրցույթ կարելի է հայտարարել գրեթե ցանկացած ծառայության համար
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Բոլոր հիմնական ոլորտները մեկ տեղում։
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                Tend.am-ում պատվիրատուն կարող է մրցույթ հայտարարել տան,
                բիզնեսի, տեխնոլոգիայի, իրավական, կրթական, ստեղծագործական և
                առօրյա ծառայությունների համար։
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-4xl font-black text-amber-300">
                  {categories.length}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  խոշոր ոլորտ
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-4xl font-black text-amber-300">
                  {totalServices}+
                </p>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  ծառայության ուղղություն
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <ServiceSearch categories={categories} />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category.id}
              className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
            >
              <Link
                href={ROUTES.categoryDetail(category.id)}
                className="group flex items-center justify-between gap-3 rounded-3xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:ring-slate-300"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 transition group-hover:bg-amber-200">
                    <Layers3 className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-black text-slate-950">
                      {category.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      {category.services.length} ծառայություն
                    </span>
                  </span>
                </span>
                <span className="text-sm font-black text-slate-400 transition group-hover:text-amber-700">
                  →
                </span>
              </Link>
            </article>
          ))}
        </section>
        </div>
      </main>
    </div>
  );
}
