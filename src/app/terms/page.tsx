import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SupportContactLinks } from "@/components/support-contact-links";
import { SITE_PUBLIC_ORIGIN } from "@/lib/absolute-app-url";
import { EXPIRED_UNAWARDED_MIN_BIDS } from "@/lib/expired-unawarded";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Օգտագործման պայմաններ | Tend.am",
  description:
    "Tend.am հարթակի բիզնես մոդելը, մրցույթների կանոնները, վճարները, մոդերացիան և պատասխանատվությունը։",
};

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

export default function TermsPage() {
  const lastUpdated = "17 մայիսի, 2026";

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

          <div className="mt-10 space-y-12">
            <Section title="1) Ընդհանուր">
              <p>
                <strong className="text-slate-900">Tend.am</strong>-ը հայաստանյան
                մրցույթների հարթակ է, որտեղ{" "}
                <strong className="text-slate-900">պատվիրատուն</strong> (հայտարարող)
                հրապարակում է աշխատանքը, իսկ{" "}
                <strong className="text-slate-900">մասնագետները</strong> ուղարկում
                են առաջարկներ՝ գին, ժամկետ և ուղեկցող նամակով։
              </p>
              <p>
                Հարթակից օգտվելով՝ դուք հաստատում եք, որ կօգտագործեք սերվիսները{" "}
                <strong className="text-slate-900">բարի նպատակներով</strong>, առանց
                օրենքը, երրորդ անձանց իրավունքները և սույն կանոնները խախտելու։
              </p>
              <p>
                Կանոնները կարող են թարմացվել՝ ծառայության զարգացման համար։
                Կարևոր փոփոխությունների դեպքում կփորձենք տեղեկացնել հարթակի
                միջոցով (ծանուցումներ, էլ. փոստ կամ Telegram, եթե միացված է)։
              </p>
            </Section>

            <Section title="2) Ինչպես է աշխատում հարթակը">
              <p className="font-black text-slate-900">Պատվիրատուի համար</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Հրապարակում է մրցույթ՝ նկարագրություն, ոլորտ/ծառայություն,
                  լուսանկարներ, բյուջե, վերջնաժամկետ։
                </li>
                <li>
                  Ստանում է մասնագետների առաջարկները (մինչև փակվելը՝ փակ
                  առաջարկների ռեժիմում)։
                </li>
                <li>
                  Մրցույթի ավարտից հետո համեմատում է առաջարկները, ընտրում է
                  հաղթող կատարողին և ավարտում է համագործակցությունը հարթակի
                  գործիքներով (կարգավիճակներ, կապ, գնահատականներ)։
                </li>
              </ol>
              <p className="pt-2 font-black text-slate-900">Մասնագետի համար</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Գրանցում, հաշվի հաստատում (Telegram կամ Email)։</li>
                <li>
                  Պրոֆիլ, պորտֆոլիո, փաստաթղթեր (ըստ ցանկության)՝ վստահություն
                  ստեղծելու համար։
                </li>
                <li>
                  Ընտրում է հարմար մրցույթներ և ուղարկում առաջարկ՝ վճարովի կամ
                  անվճար մասնակցության դեպքում (տես բաժին 4)։
                </li>
              </ol>
              <p>
                Մանրամասն քայլերը՝{" "}
                <Link
                  href={ROUTES.howItWorks}
                  className="font-bold text-amber-800 underline underline-offset-2"
                >
                  Ինչպես է աշխատում
                </Link>{" "}
                էջում։
              </p>
            </Section>

            <Section title="3) Փակ առաջարկներ">
              <p>
                Լռելյայն մրցույթներում գործում է{" "}
                <strong className="text-slate-900">փակ առաջարկների</strong>{" "}
                սկզբունքը. մինչև մրցույթի վերջնաժամկետը կամ հաղթողի ընտրությունը
                մասնագետները չեն տեսնում մրցակիցների գները և մանրամասները։
              </p>
              <p>
                Նպատակը արդար մրցակցությունն է՝ առաջարկները լինեն ըստ իրական
                արժեքի, ոչ թե «մի քիչ էժան» մոտեցմամբ։ Փակվելուց հետո պատվիրատուն
                տեսնում է բոլոր առաջարկները մեկ պատկերում։
              </p>
            </Section>

            <Section title="4) Ֆինանսական մոդել և վճարներ">
              <p className="font-black text-slate-900">Պատվիրատու</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Մրցույթ տեղադրելը անվճար է</strong>։
                  Հարթակը չի գանձում մրցույթ հրապարակելու համար։
                </li>
                <li>
                  Պատվիրատուն վճարում է միայն իր ընտրած կատարողի հետ աշխատանքի
                  արժեքը՝ ըստ պայմանավորվածության (այն դուրս է հարթակի միջնորդավճարից,
                  եթե առանձին չի նշված այլ կարգ)։
                </li>
              </ul>

              <p className="pt-3 font-black text-slate-900">Մասնագետ</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-900">Մուտքային վճար (bid fee)</strong>՝
                  վճարվում է միայն առաջարկ ուղարկելու պահին, եթե չի կիրառվում
                  անվճար մասնակցությունը։ Գումարը հաշվարկվում է դինամիկ՝ ըստ
                  մրցույթի բյուջեի մեջության, ոլորտի և մոտեցող վերջնաժամկետի
                  (սովորաբար մոտավորապես{" "}
                  <strong className="text-slate-900">500–5 000 AMD</strong>,
                  կլորացված 100 AMD-ով)։
                </li>
                <li>
                  <strong className="text-slate-900">Անվճար մասնակցություն</strong>՝
                  ամսական առաջին{" "}
                  <strong className="text-slate-900">3</strong> դիմումը կարող է
                  լինել անվճար (ըստ հաշվի հաշվառման)։
                </li>
                <li>
                  Կարող է գործել <strong className="text-slate-900">բաժանորդագրություն</strong>{" "}
                  (ամսական փաթեթ)՝ մասնակցության սահմանաչափով, եթե այդ ծառայությունը
                  ակտիվ է ձեր հաշվում։
                </li>
                <li>
                  Վճարումը կատարվում է հարթակի{" "}
                  <strong className="text-slate-900">դրամապանակից</strong> (կրեդիտ)։
                  Դրամապանակը կարելի է լիցքավորել հարթակում նախատեսված
                  եղանակներով։
                </li>
              </ul>

              <p className="pt-3 font-black text-slate-900">Ինչ չի անում հարթակը</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Tend.am-ը <strong className="text-slate-900">չի պահում</strong> ամբողջ
                  աշխատանքի գումարը էսքրոու/պահումի հաշվին, եթե առանձին չի
                  ներդրվել այդ գործառույթը։
                </li>
                <li>
                  Հարթակի հիմնական եկամուտը մասնագետի մասնակցության վճարներն
                  ու բաժանորդագրություններն են, ոչ թե աշխատանքի գնի տոկոսը։
                </li>
                <li>
                  Վճարային ինտեգրացիաները (օր. Idram, Telcell, vPOS) կարող են
                  ավելացվել կամ փոխվել՝ ըստ տեխնիկական իրականացման։
                </li>
              </ul>
            </Section>

            <Section title="5) Մրցույթի հրապարակում և մոդերացիա">
              <p>
                Նոր մրցույթը սովորաբար սկսում է{" "}
                <strong className="text-slate-900">«Քննարկում» (REVIEW)</strong>{" "}
                կարգավիճակից. ադմինիստրատորները ստուգում են բովանդակությունը,
                ապա հրապարակում են որպես{" "}
                <strong className="text-slate-900">«Ակտիվ»</strong>։
              </p>
              <p>
                Մոդերատորները կարող են մերժել կամ խմբագրել մրցույթը, եթե այն
                խախտում է կանոնները (կոնտակտային տվյալներ նկարագրության մեջ,
                ցանկալի չեղարկված բովանդակություն և այլն)։
              </p>
              <p>
                <strong className="text-slate-900">Ակտիվ</strong> մրցույթում, եթե
                արդեն կան առաջարկներ, մրցույտի հիմնական պայմանները (բյուջե,
                վերջնաժամկետ և նմանատիպ դաշտեր) չեն փոխվում՝ արդարության համար։
              </p>
            </Section>

            <Section title="6) Առաջարկներ և մոդերացիա">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Մասնագետը մեկ մրցույթում կարող է ունենալ{" "}
                  <strong className="text-slate-900">մեկ առաջարկ</strong>։
                </li>
                <li>
                  Առաջարկը ներառում է գին, ժամկետ (օրեր) և ուղեկցող նամակ
                  (նվազագույն երկարություն՝ հարթակի սահմաններով)։
                </li>
                <li>
                  Առաջարկները կարող են ստուգվել մոդերացիայից առաջ, քանի դեռ
                  չեն հասնել պատվիրատուին (օր. կոնտակտային տվյալների արգելք)։
                </li>
                <li>
                  Մերժված առաջարկի դեպքում մուտքային վճարը, եթե վճարված էր,
                  կարող է <strong className="text-slate-900">վերադարձվել կրեդիտով</strong>{" "}
                  դրամապանակ (ըստ հարթակի կանոնների)։
                </li>
                <li>
                  Մրցույթի չեղարկման կամ հեռացման դեպքում վճարած մուտքային
                  վճարները նույնպես կարող են վերադարձվել կրեդիտով։
                </li>
              </ul>
            </Section>

            <Section title="7) Հաշվի հաստատում և վստահություն">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Գրանցման ժամանակ ընտրում եք հաստատման ալիքը՝{" "}
                  <strong className="text-slate-900">Telegram</strong> կամ{" "}
                  <strong className="text-slate-900">Email</strong>։
                </li>
                <li>
                  Առաջարկ ուղարկելու և որոշ գործառույթների համար պահանջվում է
                  հաստատված հաշիվ։
                </li>
                <li>
                  Լրացուցիչ <strong className="text-slate-900">վերիֆիկացիա</strong>{" "}
                  (սելֆի + փաստաթուղթ) կարող է ավելացնել «Ստուգված» նշանը պրոֆիլում։
                </li>
                <li>
                  Մասնագետի պրոֆիլը, պորտֆոլիոն, փաստաթղթերը և կարծիքները
                  օգնում են պատվիրատուին որոշում կայացնել։
                </li>
              </ul>
            </Section>

            <Section title="8) Հաղթողի ընտրություն, կապ և ավարտ">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Վերջնաժամկետից հետո պատվիրատուն պետք է{" "}
                  <strong className="text-slate-900">ընտրի կատարողին</strong> կամ
                  ակտիվորեն ավարտի մրցույթը (չեղարկում և այլն)՝ ըստ իրական
                  իրավիճակի։
                </li>
                <li>
                  Պատվիրատուն կարող է{" "}
                  <strong className="text-slate-900">կիսվել կոնտակտով</strong>{" "}
                  ընտրված (կամ նախընտրելի) առաջարկի հետ՝ հարթակի գործիքով, որպեսզի
                  շարունակվի աշխատանքը։
                </li>
                <li>
                  Աշխատանքի ավարտից հետո կողմերը կարող են փոխադարձ{" "}
                  <strong className="text-slate-900">գնահատականներ</strong> թողնել
                  (մոդերացիայի ենթակա)։
                </li>
              </ul>
            </Section>

            <Section title="9) Մրցույթի ավարտ և կատարող չընտրելը">
              <p>
                Պատվիրատուն պարտավոր է հարգել մասնագետների ժամանակն ու մուտքային
                վճարները։
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Եթե մրցույթը <strong className="text-slate-900">ակտիվ է</strong>,
                  դեդլայնը ավարտվել է{" "}
                  <strong className="text-slate-900">ավելի քան 1 օր</strong> առաջ,
                  ստացվել է առնվազն{" "}
                  <strong className="text-slate-900">
                    {EXPIRED_UNAWARDED_MIN_BIDS} վճարովի դիմում
                  </strong>
                  , բայց կատարող չի ընտրվել՝ դա համարվում է կանոնների խախտում։
                </li>
                <li>
                  Հարթակը կարող է մրցույթի կարգավիճակը դնել{" "}
                  <strong className="text-slate-900">
                    «Ժամկետանց · կատարող չընտրված»
                  </strong>
                  , հայտարարողի հանրային գնահատականին ավելացնել հարթակի նշում
                  (ներառյալ ցածր գնահատական) և ուղարկել նախազգուշացում կայքի
                  ծանուցումներով, Telegram-ով և էլ. փոստով։
                </li>
                <li>
                  Նույն հայտարարողի{" "}
                  <strong className="text-slate-900">երկու և ավելի</strong> նման
                  խախտման դեպքում հարթակը կարող է սահմանափակել հաշիվը, ներառյալ
                  կարգելափակումը՝ ադմինիստրատիվ որոշմամբ։
                </li>
              </ul>
            </Section>

            <Section title="10) Գնահատականներ և կարծիքներ">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Ավարտված համագործակցությունից հետո կողմերը կարող են թողնել
                  կարծիք և գնահատական (սովորաբար 1–5)։
                </li>
                <li>
                  Կարծիքները կարող են անցնել մոդերացիա։ Հանրությանը երևում են
                  հաստատված գնահատականները։
                </li>
                <li>
                  Հարթակը կարող է ավելացնել{" "}
                  <strong className="text-slate-900">հարթակի նշում</strong> կարծիքի
                  տեսքով, եթե խախտվել են կանոնները (օր. կատարող չընտրելը ժամկետանց
                  մրցույթում)։
                </li>
              </ul>
            </Section>

            <Section title="11) Ծանուցումներ">
              <p>
                Հարթակը կարող է ուղարկել ծանուցումներ մրցույթի կարգավիճակի,
                առաջարկների, մոդերացիայի, վճարների և կարևոր իրադարձությունների
                մասին՝ ըստ ձեր{" "}
                <strong className="text-slate-900">notificationChannel</strong>{" "}
                կարգավորումների (Telegram, Email կամ երկուսը)։
              </p>
              <p>
                Որոշ կարևոր նախազգուշացումներ (օր. ժամկետանց մրցույթ) կարող են
                ուղարկվել բոլոր հասանելի ալիքներով։
              </p>
            </Section>

            <Section title="12) Բողոքներ, վեճեր և աջակցություն">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Մրցույթի վերաբերյալ կարող եք ուղարկել{" "}
                  <strong className="text-slate-900">բողոք</strong> հարթակի
                  գործիքներով։
                </li>
                <li>
                  Գրանցված օգտատերերը կարող են դիմել{" "}
                  <strong className="text-slate-900">աջակցության չատ</strong> կայքում
                  (ներքև աջի կոճակ)։
                </li>
                <li>
                  Վեճերի դեպքում Tend.am-ի թիմը կարող է միջամտել, ստուգել գործը
                  և կիրառել միջոցներ (նախազգուշացում, սահմանափակում, կարգելափակում)։
                </li>
              </ul>
            </Section>

            <Section title="13) Արգելված վարքագիծ">
              <ul className="list-disc space-y-2 pl-5">
                <li>Կեղծ հաշիվներ, խաբեություն, սպամ։</li>
                <li>
                  Կոնտակտային տվյալների տեղադրում առաջարկի/մրցույթի մեջ մինչև
                  հարթակի կանոններով թույլատրված փուլը։
                </li>
                <li>Մրցակցության մանիպուլյացիա, արհեստական գներ։</li>
                <li>Իրավունքները խախտող բովանդակություն։</li>
                <li>Հարթակի տեխնիկական սահմանափակումների շրջանցում։</li>
              </ul>
            </Section>

            <Section title="14) Պատասխանատվության սահմանափակում">
              <p>
                Tend.am-ը միջնորդային հարթակ է. պայմանագրային հարաբերությունները
                պատվիրատուի և մասնագետի միջև են, եթե կողմերը այլ բան չեն
                պայմանավորվել։
              </p>
              <p>
                Մենք չենք երաշխավորում մրցույթի 100% արդյունք կամ աշխատանքի
                որակը, սակայն ձգտում ենք պահպանել կանոններ, մոդերացիա և
                վստահելի գործիքներ։
              </p>
              <p>
                Մանրամասն իրավաբանական փաստաթուղթ (պատասխանատվության սահմանափակում,
                փոխհաշվարկումներ) կարող է հաստատվել առանձին։
              </p>
            </Section>

            <p className="rounded-3xl bg-amber-50 p-5 text-sm font-bold text-amber-950 ring-1 ring-amber-100">
              Կարևոր է նաև ընթերցել{" "}
              <Link
                href={ROUTES.privacy}
                className="underline decoration-amber-500 underline-offset-2 hover:text-slate-950"
              >
                գաղտնիության քաղաքականությունը
              </Link>
              {" "}և{" "}
              <Link
                href={ROUTES.howItWorks}
                className="underline decoration-amber-500 underline-offset-2 hover:text-slate-950"
              >
                ինչպես է աշխատում
              </Link>{" "}
              էջերը։
            </p>
          </div>

          <div className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">Աջակցություն</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Հարցերի դեպքում կարող եք զանգահարել կամ գրել մեզ.
            </p>
            <SupportContactLinks className="mt-4" />
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
