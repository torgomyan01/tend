import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { SupportContactLinks } from "@/components/support-contact-links";
import { SITE_PUBLIC_ORIGIN } from "@/lib/absolute-app-url";
import { ROUTES } from "@/lib/routes";
import { breadcrumbList, webPage } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Գաղտնիության քաղաքականություն",
  description:
    "Tend.am հարթակում անձնական տվյալների մշակման սկզբունքները, իրավունքները և օգտագործման շրջանակը։",
  path: ROUTES.privacy,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  const lastUpdated = "6 մայիսի, 2026";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <JsonLd
        data={[
          webPage({
            name: "Գաղտնիության քաղաքականություն",
            description:
              "Tend.am հարթակում անձնական տվյալների մշակման սկզբունքները։",
            path: ROUTES.privacy,
          }),
          breadcrumbList([
            { name: "Գլխավոր", path: ROUTES.home },
            { name: "Գաղտնիություն", path: ROUTES.privacy },
          ]),
        ]}
      />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
            Կարգավորումներ և իրավունքներ
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Գաղտնիության քաղաքականություն
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

          <div className="mt-10 space-y-12">
            <Section title="1) Ընդհանուր">
              <p>
                Այս քաղաքականությունը բացատրում է, թե ինչպես է{" "}
                <strong className="text-slate-900">Tend.am</strong>-ը
                հավաքագրում, պահպանում և օգտագործում ձեր մասին տեղեկությունները,
                երբ օգտվում եք հարթակից որպես{" "}
                <strong className="text-slate-900">պատվիրատու</strong> կամ{" "}
                <strong className="text-slate-900">մասնագետ</strong>։
              </p>
              <p>
                Հարթակը նախագծված է մրցույթների ու առաջարկների գործընթացի
                աջակցման համար, այդ պատճառով որոշ տվյալներ անհրաժեշտ են
                ծառայությունների մատուցման, անվտանգության ու մոդերացիայի համար։
              </p>
            </Section>

            <Section title="2) Որ տվյալները կարող ենք ստանալ">
              <p className="font-black text-slate-900">
                Մուտքի և հաշվի շրջանակից
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Անուն, էլ․ փոստ, հեռախոս,</strong>{" "}
                  հաշվի հիմնական տվյալներ, որոնք տրամադրում եք գրանցման կամ պրոֆիլը
                  թարմացնելիս։
                </li>
                <li>
                  <strong className="text-slate-900">
                    Նույնության հաստատման նյութեր
                  </strong>{" "}
                  (սելֆի/փաստաթուղթ), եթե մասնակցում եք հարթակի վերիֆիկացման
                  գործընթացին։
                </li>
                <li>
                  <strong className="text-slate-900">
                    Նախընտրություններ ու պորտֆոլիո
                  </strong>{" "}
                  այն դաշտերում, որտեղ դուք ակտիվ եք լրացնում պատկերագրությունները,
                  ծառայությունների ընտրությունները և աշխատանքների նյութերը։
                </li>
              </ul>

              <p className="pt-2 font-black text-slate-900">
                Մրցույթներ ու առաջարկներ
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Մրցույթի բովանդակությունը</strong>՝
                  նկարագրություն, ընտրվող ոլորտներ և ծառայություններ,
                  հավելված ֆայլեր ու պատկերներ, որոնք տեղադրում եք։
                </li>
                <li>
                  <strong className="text-slate-900">
                    Մասնակցության/առաջարկի տեղեկություն
                  </strong>{" "}
                  (գներ, ուղեկցող նամակ, ժամկետներ՝ համաձայն հարթակի կանոնների)։
                </li>
                <li>
                  <strong className="text-slate-900">Կապի փոխանակում</strong>, երբ
                  հարթակի գործառույթները թույլ են տալիս կիսվել կոնտակտով կամ
                  հաղորդակցվել մրցույթի շրջանակում։
                </li>
              </ul>

              <p className="pt-2 font-black text-slate-900">
                Վճարումներ և դրամապանակ
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">
                    Գործարքների մետատվյալներ
                  </strong>{" "}
                  (գումար, կարգավիճակ, ժամանակ), որոնք կապված են առաջարկների
                  օգտագործման հետ (ինչպես նախատեսված է հարթակում)։
                </li>
                <li>
                  Վճարային կամ դրամապանակային ինտեգրացիաների դեպքում վճարային
                  միջոցառումների մասին մանրամասն տեղեկությունները հաճախ
                  մշակվում են համապատասխան օպերատորի կողմից։ Tend.am-ը սովորաբար
                  պահպանում է գործառնական պատկերը (գումար, կարգավիճակ, ժամանակ),
                  առանց պահելու լրիվ քարտային տվյալներ՝ կախված իրականացված
                  լուծմանից։

                </li>
              </ul>

              <p className="pt-2 font-black text-slate-900">
                Տեխնիկական և անվտանգության պատճառներով
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Մուտքի օրագրեր և տեխնիկական մետադատա</strong>{" "}
                  (օր. IP հասցե, սարքի և դիտարկիչի ընդհանուր բնութագրեր,
                  ժամանակ), նաև տեխնիկական վերլուծություն, կասկածելի ակտիվության
                  նկատման և սերվերի բեռի կառավարման համար։

                </li>
                <li>
                  <strong className="text-slate-900">Cookies և նման տեխնոլոգիաներ</strong>՝
                  հաշվային session-ների, նախընտրությունների ու գործառույթների աշխատանք։

                </li>
              </ul>
            </Section>

            <Section title="3) Ինչու ենք օգտագործում այդ տվյալները">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Հարթակի ծառայությունների մատուցում, հաշիվ ստեղծում և օգտագործումը
                  ապահովել։
                </li>
                <li>
                  Մրցույթների հայտարարում և առաջարկների ընդունում՝ ըստ ձեր ընտրած
                  կանոնների։
                </li>
                <li>
                  Ծանուցումներ ու հաղորդակցություն (օր. մրցույթի վիճակ, հիշեցումներ,
                  կարևոր փոփոխություններ՝ կախված ձեր նախընտրությունից)։

                </li>
                <li>
                  Հարթակի կայունությունը, պատահարների հետաքննությունը, ընդհանուր
                  անվտանգությունը և օրենքով նախատեսված իրավախախտումների
                  պատասխանատվությունը։

                </li>
                <li>
                  Օրենքով առաջացած պարտավորությունների կատարում՝ երբ դա փաստացի
                  պահանջվում է։
                </li>
              </ul>
            </Section>

            <Section title="4) Տվյալների փոխանցում երրորդ անձանց">
              <p>
                Մենք <strong className="text-slate-900">չենք վաճառում</strong>{" "}
                ձեր անձնական տեղեկությունը գովազդատուներին որպես ցուցակ։
              </p>
              <p className="font-black text-slate-900 pt-2">Կարող ենք փոխանցել երբ՝</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Ծառայություն մատուցողներ</strong>՝
                  հոսթինգ, էլ․ փոստ, վերլուծություն, ծանուցումներ (օր. Telegram
                  bot), որոնք մշակում են տվյալները մեր ցուցումներով։
                </li>
                <li>
                  <strong className="text-slate-900">Մոդերատորներ/ադմինիստրատորներ</strong>՝
                  կանոնների խախտումների, վերիֆիկացիաների և բողոքների
                  դիտարկման համար։
                </li>
                <li>
                  <strong className="text-slate-900">Այլ օգտվողներ</strong>՝ միայն
                  այն չափով, որն անհրաժեշտ է հարթակի տրամաբանությանը (օր. մրցույթի
                  նկարագրությունը, հրապարակային պրոֆիլի դաշտերը, կամ կոնտակտի
                  կիսումը, եթե այդ գործառույթն ակտիվ է և դուք համաձայն եք)։
                </li>
                <li>
                  <strong className="text-slate-900">Օրենքով պարտադրված</strong> դեպքերում
                  պետական մարմիններին կամ դատարանին։
                </li>
              </ul>
            </Section>

            <Section title="5) Պահպանման ժամկետ">
              <p>
                Տվյալները պահվում են այնքան ժամանակ, որքան անհրաժեշտ է ձեր
                հաշվին, մրցույթներին, ֆինանսական հաշվառմանը և իրավական
                պարտավորություններին համապատասխան։ Ջնջված կամ ապաակտիվացված
                բովանդակության նկատմամբ կարող են պահպանվել տեխնիկական պատճեններ
                մինչև պահեստավորման ցիկլի ավարտը։
              </p>
            </Section>

            <Section title="6) Ձեր իրավունքները">
              <p>
                Կարող եք դիմել{" "}
                <Link
                  href={ROUTES.account}
                  className="font-bold text-amber-800 underline decoration-amber-400/70 underline-offset-2 hover:text-slate-950"
                >
                  հաշվի կարգավորումների
                </Link>{" "}
                միջոցով կամ ադմինիստրացիային՝
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Մուտք գործել ձեր մասին հիմնական տեղեկություններին։</li>
                <li>Ուղղել կամ թարմացնել ոչ ճիշտ տվյալները։</li>
                <li>
                  Պահանջել հաշվի կամ որոշ տվյալների ջնջում, եթե դա չխանգարի
                  օրենքով նախատեսված պահպանմանը։
                </li>
                <li>
                  Բողոք ներկայացնել, եթե կարծում եք, որ մշակումը չի համապատասխանում այս
                  քաղաքականությանը կամ կիրառելի օրենքին՝ մեր մոտ գրավոր դիմումով։
                </li>
              </ul>
              <p className="text-sm text-slate-500">
                Մանրամասները կարող են կախված լինել կիրառելի օրենսդրությունից ու
                հաշվապահական ու ֆինանսական պարտավորությունից (օր. հաշվային փաստաթղթերի
                պահպանում)։

              </p>
            </Section>

            <Section title="7) Անվտանգություն">
              <p>
                Կիրառվում են տեխնիկական և կազմակերպական միջոցներ՝ հասանելիությունը
                սահմանափակելու, չարտոնված մուտքը նվազեցնելու և տվյալները
                պատասխանատու պահելու համար (կախված լուծման փուլից և
                ինտեգրացիաներից)։

              </p>
              <p>
                Ինտերնետով ուղարկված տվյալների դեպքում միշտ գոյություն ունեն
                արտաքին ռիսկեր․ խնդրում ենք պահպանել գաղտնաբառը, չկիսվել մուտքի
                տվյալներով և խուսափել չպաշտպանված ցանցերից՝ հաշվի
                գործողությունների ժամանակ։
              </p>
            </Section>

            <Section title="8) Փոփոխություններ">
              <p>
                Այս քաղաքականությունը կարող է թարմացվել։ Էական փոփոխությունների
                դեպքում կարող ենք ցուցադրել ծանուցում հարթակում կամ էլ․ փոստով
                (եթե ունենք ձեր հասցեն)։ Շարունակ օգտագործելը կարող է
                նշանակել համաձայնություն թարմացված տարբերակին։
              </p>
            </Section>

            <Section title="9) Կապ">
              <p className="mb-4">
                Հարցեր կամ դիմումներ գաղտնիության վերաբերյալ կարող եք
                զանգահարել կամ գրել մեզ.
              </p>
              <SupportContactLinks />
            </Section>
          </div>

          <div className="mt-12 flex flex-wrap gap-3 border-t border-slate-100 pt-8">
            <Link
              href={ROUTES.home}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Վերադառնալ գլխավոր
            </Link>
            <Link
              href={ROUTES.login}
              className="inline-flex items-center justify-center rounded-full bg-slate-50 px-6 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-200 transition hover:bg-white"
            >
              Մուտք
            </Link>
            <Link
              href={ROUTES.terms}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Պայմաններ
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
