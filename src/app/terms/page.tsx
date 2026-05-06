import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SITE_PUBLIC_ORIGIN } from "@/lib/absolute-app-url";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Օգտագործման պայմաններ | Tend.am",
  description:
    "Tend.am հարթակի օգտագործման ընդհանուր կանոնները, իրավասությունները և պատասխանատվությունը։",
};

export default function TermsPage() {
  const lastUpdated = "6 մայիսի, 2026";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
            Կանոնակարգ
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Օգտագործման պայմաններ
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Վերջին թարմացում՝ {lastUpdated} · Կայք՝{" "}
            <Link
              href={ROUTES.home}
              className="font-bold text-slate-700 underline decoration-amber-400/70 underline-offset-2 hover:text-slate-950"
            >
              {SITE_PUBLIC_ORIGIN.replace(/^https:\/\//, "")}
            </Link>
          </p>

          <div className="mt-10 space-y-6 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
            <p>
              Այս էջում ամփոփվում են <strong className="text-slate-900">Tend.am</strong>
              հարթակից օգտվելու ընդհանուր կանոնները։ Կանոնները կարող են
              լրացվել կամ փոփոխվել ըստ ծառայության զարգացման՝ մինչև մանրամասն
              իրավաբանական տարբերակի հաստատումը։

            </p>
            <p>
              Հարթակից օգտվելով՝ դուք հաստատում եք, որ կողմ եք օգտագործել սերվիսները
              <strong className="text-slate-900"> բարի նպատակներով</strong>, առանց
              օրենքը, երրորդ անձանց իրավունքները և հարթակի կարգավորումները խախտելու։

            </p>
            <p>
              Մրցույթների, առաջարկների, վճարների, վերիֆիկացիաների և մոդերացիայի
              ընդհանուր տրամաբանությունը համահունչ է պլատפորմի իրական գործառույթներին՝
              հրապարակված կարճ նկարագրություններով (օր. գլխավոր էջ, մասնագետների
              էջ, հաշվի կարգավորումներ)։

            </p>
            <p>
              Կոնկրետ իրավաբանական պայմանների (ներառյալ պատասխանատվության
              սահմանում, փոխհաշվարկման կարգ) ամբողջական փաստաթուղթը կարող է
              պատրաստվել առանձին՝ օրեցօրս կողմերի համար ավելի պարզ ձևով։
            </p>

            <p className="rounded-3xl bg-amber-50 p-5 text-sm font-bold text-amber-950 ring-1 ring-amber-100">
              Կարևոր է նաև ընթերցել {""}
              <Link
                href={ROUTES.privacy}
                className="underline decoration-amber-500 underline-offset-2 hover:text-slate-950"
              >
                գաղտնիության քաղաքականությունը
              </Link>
              {""}՝ տեղեկությունը, թե ինչպես ենք մշակում անձնական տվյալները։

            </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-3 border-t border-slate-100 pt-8">
            <Link
              href={ROUTES.home}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Վերադառնալ գլխավոր
            </Link>
            <Link
              href={ROUTES.privacy}
              className="inline-flex items-center justify-center rounded-full bg-slate-50 px-6 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-200 transition hover:bg-white"
            >
              Գաղտնիություն
            </Link>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © 2026{" "}
          <Link href={ROUTES.home} className="hover:text-slate-950">
            Tend.am
          </Link>
        </p>
        <div className="flex gap-5">
          <Link href={ROUTES.privacy} className="transition hover:text-slate-950">
            Գաղտնիություն
          </Link>
          <Link href={ROUTES.terms} className="transition hover:text-slate-950">
            Պայմաններ
          </Link>
        </div>
      </footer>
    </div>
  );
}
