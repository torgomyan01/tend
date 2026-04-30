import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  EyeOff,
  Gavel,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { FeaturedTenderSlider } from "@/components/featured-tender-slider";
import { ServiceSearch } from "@/components/service-search";
import { SiteHeader } from "@/components/site-header";
import { ROUTES } from "@/lib/routes";

const stats = [
  { value: "0 ֏", label: "Առաջին 3 մրցույթի մասնակցությունը անվճար է" },
  { value: "24/7", label: "մրցույթների հասանելիություն" },
  { value: "0 ֏", label: "մրցույթ տեղադրելու արժեքը անվճար է" },
];

const steps = [
  {
    icon: Gavel,
    title: "Հայտարարեք մրցույթ",
    description:
      "Նկարագրեք աշխատանքը, ավելացրեք նկարներ, բյուջե և ժամկետներ՝ մի քանի պարզ քայլով։",
  },
  {
    icon: EyeOff,
    title: "Ստացեք փակ առաջարկներ",
    description:
      "Մասնագետները ուղարկում են գին, ժամկետ և ուղեկցող նամակ, բայց չեն տեսնում մրցակիցների առաջարկները։",
  },
  {
    icon: BadgeCheck,
    title: "Ընտրեք վստահելի կատարողի",
    description:
      "Համեմատեք առաջարկները փակվելուց հետո, ընտրեք հաղթողին և ավարտեք գործարքը գնահատականով։",
  },
];

const features = [
  {
    icon: WalletCards,
    title: "Վճարում միայն իրական հնարավորության համար",
    description:
      "Մասնագետը վճարում է միայն առաջարկ ուղարկելու պահին կամ օգտագործում է ամսական փաթեթը՝ առանց ավելորդ միջնորդավճարների։",
  },
  {
    icon: Clock3,
    title: "Արագ որոշում՝ հստակ վերջնաժամկետով",
    description:
      "Յուրաքանչյուր մրցույթ ունի փակման ժամկետ, որ պատվիրատուն արագ համեմատի առաջարկները, իսկ մասնագետը չսպասի անորոշության մեջ։",
  },
  {
    icon: ShieldCheck,
    title: "Վստահելի մասնագետներ, իրական կարծիքներ",
    description:
      "Վարկանիշները, ավարտված աշխատանքների կարծիքները և հաստատման նշանները օգնում են ընտրել ոչ թե ամենաէժանին, այլ ամենահարմար կատարողին։",
  },
  {
    icon: CreditCard,
    title: "Պատրաստ տեղական վճարումների համար",
    description:
      "Դրամապանակի կառուցվածքը պատրաստ է Idram, Telcell և vPOS ինտեգրացիաների համար, որպեսզի բիզնես մոդելը scale անի հայկական շուկայի հետ։",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <ServiceSearch />
        </div>

        <section className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div className="absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl" />

          <div className="flex flex-col justify-center">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-4 py-2 text-sm font-bold text-amber-800 shadow-sm backdrop-blur">
              <Sparkles className="size-4" />
              Հայաստանի առաջին խելացի մրցույթների հարթակը
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
              Գտեք ճիշտ մասնագետին՝ առանց ժամանակ կորցնելու։
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:mt-7 sm:text-xl">
              Tend.am-ը կապում է պատվիրատուներին և ստուգված մասնագետներին։
              Տեղադրեք աշխատանքը անվճար, ստացեք փակ առաջարկներ և ընտրեք լավագույն
              կատարողին՝ թափանցիկ գործընթացով։
            </p>
            <div id="start" className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href={ROUTES.createTender}
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
              >
                Տեղադրել մրցույթ
                <ArrowRight className="size-5 transition group-hover:translate-x-1" />
              </Link>
              <a
                href={ROUTES.sections.providers}
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
              >
                Դառնալ մասնագետ
              </a>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur"
                >
                  <div className="text-2xl font-black text-slate-950">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-6 -z-10 rounded-[3rem] bg-slate-950 blur-2xl opacity-10" />
            <FeaturedTenderSlider />
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Ինչպես է աշխատում
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Երեք պարզ քայլ՝ գաղափարից մինչև պայմանագիր։
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
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
                  <h3 className="mt-7 text-2xl font-black">{step.title}</h3>
                  <p className="mt-4 leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
                  Ինչու Tend.am
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                  Ավելի շատ առաջարկներ, ավելի քիչ ռիսկ և պարզ վճարային մոդել։
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Պատվիրատուն անվճար հայտարարում է աշխատանքը, մասնագետները
                  մրցում են փակ առաջարկներով, իսկ հարթակը պահում է գործընթացը
                  արագ, վերահսկելի և վստահելի։
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <article
                      key={feature.title}
                      className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/10"
                    >
                      <Icon className="size-7 text-amber-300" />
                      <h3 className="mt-5 text-xl font-black">
                        {feature.title}
                      </h3>
                      <p className="mt-3 leading-7 text-slate-300">
                        {feature.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          id="providers"
          className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8"
        >
          <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
            <div className="flex items-center gap-2 text-amber-700">
              <Star className="size-5 fill-amber-400" />
              <span className="text-sm font-black uppercase tracking-[0.2em]">
                Պատվիրատուների համար
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Պատվիրեք աշխատանքը վստահելի ձևով։
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Մրցույթ տեղադրելն անվճար է։ Դուք ստանում եք կառուցվածքային
              առաջարկներ՝ գին, ժամկետ, փորձ և նամակ, հետո ընտրում եք լավագույն
              տարբերակը։
            </p>
          </div>

          <div className="rounded-[2.5rem] bg-amber-300 p-8 shadow-xl shadow-amber-900/10 lg:p-10">
            <div className="flex items-center gap-2 text-slate-950">
              <WalletCards className="size-5" />
              <span className="text-sm font-black uppercase tracking-[0.2em]">
                Մասնագետների համար
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Վճարեք միայն իրական հնարավորության համար։
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-800">
              Յուրաքանչյուր առաջարկ արժե 1000 ֏ կամ օգտագործվում է
              բաժանորդագրության ամսական սահմանաչափից։ Փակ առաջարկների համակարգը
              պահում է մրցակցությունը արդար։
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 Tend.am. Մասնավոր մրցույթների հարթակ Հայաստանի համար։</p>
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
