import {
  BadgeCheck,
  EyeOff,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { JsonLd } from "@/components/json-ld";
import { ProvidersRegisterCta } from "@/components/providers-register-cta";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { breadcrumbList, webPage } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Մասնագետների համար",
  description:
    "Գտեք նոր պատվերներ Tend.am-ում՝ փակ առաջարկներով, պրոֆիլով, պորտֆոլիոյով և վարկանիշով։ Սկսեք մասնակցել մրցույթներին։",
  path: ROUTES.sections.providers,
});

const valueProps = [
  {
    icon: EyeOff,
    title: "Փակ առաջարկներ՝ առանց գնային պատերազմի",
    description:
      "Դուք չեք տեսնում մյուս մասնագետների գները մինչև վերջնաժամկետը։ Սա թույլ է տալիս առաջարկ ուղարկել ըստ իրական արժեքի, ոչ թե “մի քիչ էժան” մոտեցմամբ։",
  },
  {
    icon: BadgeCheck,
    title: "Վստահություն՝ պրոֆիլ, պորտֆոլիո և փաստաթղթեր",
    description:
      "Լրացրեք ձեր մասին բաժինը, կցեք դիպլոմներ/լիցենզիաներ և ցուցադրեք աշխատանքները պորտֆոլիոյում՝ պատվիրատուի որոշումը հեշտացնելու համար։",
  },
  {
    icon: Star,
    title: "Գնահատականներ՝ ավարտված աշխատանքներից հետո",
    description:
      "Յուրաքանչյուր համագործակցությունից հետո հավաքվում է կարծիք ու վարկանիշ՝ երկարաժամկետ վստահության համար։",
  },
  {
    icon: WalletCards,
    title: "Պարզ վճարային մոդել",
    description:
      "Վճարում եք միայն մասնակցության պահին կամ օգտվում եք փաթեթից՝ առանց ավելորդ միջնորդավճարների։",
  },
  {
    icon: ShieldCheck,
    title: "Անվտանգություն և վերահսկելի գործընթաց",
    description:
      "Կարգավիճակներ, ժամկետներ, կապի փոխանակում՝ վերահսկվող փուլերով, որպեսզի աշխատանքը չկորչի “չատերում”։",
  },
];

const steps = [
  {
    title: "1) Գրանցվել և Telegram վերիֆիկացիա անցնել",
    description:
      "Հաշիվը Telegram-ով հաստատվում է՝ նոր աշխատանքի ծանուցումների և հաշվի անվտանգության համար։",
  },
  {
    title: "2) Լրացնել պրոֆիլը",
    description:
      "Ավելացրեք «Իմ մասին» նկարագրությունը, հետաքրքրությունները և ավատարը, որպեսզի պատվիրատուն արագ կողմնորոշվի։",
  },
  {
    title: "3) Կցել փաստաթղթեր և պորտֆոլիո",
    description:
      "Դիպլոմներ/լիցենզիաներ + աշխատանքների նկարներ՝ վստահության և ավելի բարձր կոնվերսիայի համար։",
  },
  {
    title: "4) Ընտրել մրցույթներ և ուղարկել առաջարկ",
    description:
      "Առաջարկը ներառում է գին, ժամկետ և ուղեկցող նամակ։ Փակ առաջարկների շնորհիվ մրցակցությունը արդար է։",
  },
];

export default async function ProvidersPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <JsonLd
        data={[
          webPage({
            name: "Մասնագետների համար",
            description:
              "Գտեք նոր պատվերներ Tend.am-ում՝ փակ առաջարկներով և վարկանիշով։",
            path: ROUTES.sections.providers,
          }),
          breadcrumbList([
            { name: "Գլխավոր", path: ROUTES.home },
            { name: "Մասնագետների համար", path: ROUTES.sections.providers },
          ]),
        ]}
      />
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-950/15 sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
              Մասնագետների համար
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Գտեք նոր պատվերներ, ուղարկեք պրոֆեսիոնալ առաջարկներ և կառուցեք վստահություն։
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300 sm:text-lg">
              Tend.am-ը նախատեսված է, որ պատվիրատուն արագ գտնի վստահելի մասնագետին, իսկ դուք՝
              ստանաք ճիշտ պատվերներ՝ առանց ավելորդ աղմուկի։
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ProvidersRegisterCta isLoggedIn={isLoggedIn} />
              <Link
                href={ROUTES.tenders}
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-7 py-4 text-base font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                Դիտել մրցույթները
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {valueProps.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-5 text-xl font-black text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Ինչպես սկսել
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              4 քայլ՝ մինչև առաջին առաջարկը
            </h2>
            <div className="mt-7 space-y-4">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <p className="text-sm font-black text-slate-900">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Խորհուրդներ
            </p>
            <h2 className="mt-4 text-2xl font-black tracking-tight">
              Ինչն է բարձրացնում հաղթելու շանսը
            </h2>
            <ul className="mt-6 space-y-3 text-sm font-semibold leading-7 text-slate-600">
              <li>
                <strong className="text-slate-900">Ուղեկցող նամակ</strong> — գրեք
                կոնկրետ՝ ինչ եք առաջարկում, ինչ ժամկետում, ինչ նյութերով։
              </li>
              <li>
                <strong className="text-slate-900">Պորտֆոլիո</strong> — 3–5 լավ
                նկար հաճախ ավելի ազդեցիկ է, քան երկար տեքստը։
              </li>
              <li>
                <strong className="text-slate-900">Փաստաթղթեր</strong> — եթե
                ոլորտը պահանջում է լիցենզիա/սերտիֆիկատ, ավելացրեք։
              </li>
              <li>
                <strong className="text-slate-900">Պատասխան տվեք արագ</strong>{" "}
                — նոր մրցույթները հաճախ առաջին ժամերին են ստանում ամենաշատ
                դիտումները։
              </li>
            </ul>

            <div className="mt-8 grid gap-2">
              <Link
                href={ROUTES.accountSettings}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-slate-800"
              >
                Լրացնել պրոֆիլը
              </Link>
              <Link
                href={ROUTES.tenders}
                className="inline-flex items-center justify-center rounded-full bg-slate-50 px-6 py-4 text-base font-black text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Գտնել մրցույթ
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

