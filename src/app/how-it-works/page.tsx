import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  Gavel,
  MessageSquare,
  ShieldCheck,
  Timer,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { ROUTES } from "@/lib/routes";
import { breadcrumbList, faqPage, webPage } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Ինչպես է աշխատում",
  description:
    "Tend.am-ը կապում է պատվիրատուներին և մասնագետներին փակ առաջարկների միջոցով։ Տեսեք քայլ առ քայլ ընթացքը և կարևոր կանոնները։",
  path: ROUTES.howItWorks,
});

const steps = [
  {
    icon: Gavel,
    title: "1) Տեղադրեք մրցույթ",
    description:
      "Նկարագրեք աշխատանքը, ընտրեք ոլորտ/ծառայություն, ավելացրեք լուսանկարներ/փաստաթղթեր, նշեք ժամկետն ու բյուջեն։",
  },
  {
    icon: EyeOff,
    title: "2) Ստացեք փակ առաջարկներ",
    description:
      "Մասնագետները ուղարկում են գին, ժամկետ և ուղեկցող նամակ։ Մինչև փակվելը չեն տեսնում այլ առաջարկների մանրամասները։",
  },
  {
    icon: BadgeCheck,
    title: "3) Ընտրեք վստահելի կատարողին",
    description:
      "Փակվելուց հետո համեմատեք առաջարկները, ընտրեք հաղթողին և շարունակեք գործարքը հարթակի վերահսկելի փուլերով։",
  },
];

const rules = [
  {
    icon: Timer,
    title: "Վերջնաժամկետը կարևոր է",
    description:
      "Մրցույթը ունի փակման ժամկետ, որպեսզի մասնագետները աշխատեն հստակ ժամանակացույցով, իսկ դուք արագ որոշում կայացնեք։",
  },
  {
    icon: ShieldCheck,
    title: "Վստահություն՝ պրոֆիլով",
    description:
      "Մասնագետների պրոֆիլը, պորտֆոլիոն և փաստաթղթերը օգնում են գնահատել փորձը՝ ոչ միայն գինը։",
  },
  {
    icon: WalletCards,
    title: "Պարզ ֆինանսական տրամաբանություն",
    description:
      "Հարթակը կառուցված է, որ գործընթացը լինի կանխատեսելի՝ մասնակցության և վճարային քայլերի տեսանկյունից։",
  },
  {
    icon: MessageSquare,
    title: "Հաղորդակցություն՝ կարգավորելի",
    description:
      "Աշխատանքը չի «կորչում» չատերում․ կարգավիճակները, քայլերը և կարևոր իրադարձությունները տեսանելի են հաշվում։",
  },
];

const faqs = [
  {
    q: "Ինչու են առաջարկները «փակ»?",
    a: "Որպեսզի մասնագետները չտեսնեն մրցակիցների գները և չլինի «էժանացնենք մի քիչ» մրցավազք․ առաջարկը լինի ըստ իրական արժեքի։",
  },
  {
    q: "Ե՞րբ կարող եմ ընտրել հաղթողին",
    a: "Սովորաբար՝ մրցույթի փակվելուց հետո, երբ բոլոր առաջարկները հասանելի են համեմատության համար։",
  },
  {
    q: "Ի՞նչ է պետք հաջող մրցույթ ունենալու համար",
    a: "Լավ նկարագրություն, 1–2 իրական լուսանկար, հստակ վերջնաժամկետ և հնարավորինս ճիշտ ոլորտ/ծառայություն ընտրություն։",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <JsonLd
        data={[
          webPage({
            name: "Ինչպես է աշխատում",
            description:
              "Tend.am-ը կապում է պատվիրատուներին և մասնագետներին փակ առաջարկների միջոցով։",
            path: ROUTES.howItWorks,
          }),
          breadcrumbList([
            { name: "Գլխավոր", path: ROUTES.home },
            { name: "Ինչպես է աշխատում", path: ROUTES.howItWorks },
          ]),
          faqPage(faqs),
        ]}
      />
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-950/15 sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
              Ինչպես է աշխատում
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Պարզ սխեմա՝ պատվերից մինչև համաձայնություն։
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300 sm:text-lg">
              Tend.am-ը ստեղծված է, որ պատվիրատուն արագ գտնի վստահելի մասնագետին,
              իսկ մասնագետը՝ ստանա ճիշտ պատվերներ փակ առաջարկների միջոցով։
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={ROUTES.createTender}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-amber-300 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-300/15 transition hover:-translate-y-1 hover:bg-amber-200"
              >
                Տեղադրել մրցույթ
                <ArrowRight className="size-5" />
              </Link>
              <Link
                href={ROUTES.tenders}
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-7 py-4 text-base font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                Դիտել մրցույթները
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Քայլ առ քայլ
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              3 քայլ՝ գաղափարից մինչև պայմանագիր
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-5xl font-black text-slate-100">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-7 text-2xl font-black text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-4 leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Կարևոր կանոններ
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Ինչն է պահում գործընթացը արագ ու վստահելի
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {rules.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-black text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Հաճախ տրվող հարցեր
            </p>
            <h2 className="mt-4 text-2xl font-black tracking-tight">
              Կարճ պատասխաններ՝ մինչ սկսելը
            </h2>
            <div className="mt-6 space-y-4">
              {faqs.map((item) => (
                <div
                  key={item.q}
                  className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <p className="text-sm font-black text-slate-950">{item.q}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-2">
              <Link
                href={ROUTES.sections.providers}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-slate-800"
              >
                Մասնագետների համար
              </Link>
              <Link
                href={ROUTES.categories}
                className="inline-flex items-center justify-center rounded-full bg-slate-50 px-6 py-4 text-base font-black text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Դիտել ոլորտները
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

