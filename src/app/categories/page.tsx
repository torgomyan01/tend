import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ServiceSearch } from "@/components/service-search";
import { SiteHeader } from "@/components/site-header";
import { getCategoryVisual } from "@/lib/category-visuals";
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
                <CheckCircle2 className="size-4" />
                Մրցույթ կարելի է հայտարարել գրեթե ցանկացած ծառայության համար
              </div>
              <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-6xl">
                Բոլոր հիմնական ոլորտները մեկ տեղում։
              </h1>
              <p className="mt-5 max-w-3xl text-base sm:leading-8 text-slate-300 sm:text-lg">
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const { icon: Icon, tile } = getCategoryVisual(category.title);
            const preview = category.services.slice(0, 3);
            return (
              <Link
                key={category.id}
                href={ROUTES.categoryDetail(category.id)}
                className="group relative flex flex-col overflow-hidden rounded-4xl bg-white p-6 pt-7 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5 hover:ring-amber-200"
              >
                <div
                  className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-amber-100/0 blur-2xl transition duration-500 group-hover:bg-amber-200/50"
                  aria-hidden
                />

                {/* Մեծ իկոնկա՝ վերին աջ անկյունում */}
                <span
                  className={`absolute right-5 top-5 grid size-20 place-items-center rounded-3xl ${tile} shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-lg`}
                >
                  <Icon className="size-10" strokeWidth={1.75} />
                </span>

                <div className="relative max-w-[calc(100%-5.5rem)]">
                  <h3 className="text-lg font-black leading-tight tracking-tight text-slate-950">
                    {category.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                    {category.description}
                  </p>
                </div>

                {preview.length > 0 ? (
                  <div className="relative mt-4 flex flex-wrap gap-1.5">
                    {preview.map((service) => (
                      <span
                        key={service.id}
                        className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
                      >
                        {service.title}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="relative mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                    {category.services.length} ծառայություն
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-slate-400 transition group-hover:text-amber-700">
                    Դիտել
                    <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
        </div>
      </main>
    </div>
  );
}
