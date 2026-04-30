import { ArrowRight, Layers3, Sparkles } from "lucide-react";
import Link from "next/link";
import { ServiceSearch } from "@/components/service-search";
import { SiteHeader } from "@/components/site-header";
import { ROUTES } from "@/lib/routes";
import { serviceCategories } from "@/lib/service-categories";

const totalServices = serviceCategories.reduce(
  (sum, category) => sum + category.services.length,
  0,
);

export default function CategoriesPage() {
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
                  {serviceCategories.length}
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
          <ServiceSearch />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceCategories.map((category) => (
            <article
              key={category.title}
              className="flex flex-col rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                    <Layers3 className="size-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black tracking-tight sm:text-2xl">
                    {category.title}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  {category.services.length}+
                </span>
              </div>
              <p className="mt-3 leading-7 text-slate-600">
                {category.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {category.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
        </div>
      </main>
    </div>
  );
}
