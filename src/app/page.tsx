import {
  Accessibility,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  EyeOff,
  Gavel,
  Layers3,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  WalletCards,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { FeaturedTenderSlider } from "@/components/featured-tender-slider";
import { HomeCategoriesMarquee } from "@/components/home-categories-marquee";
import { HomeFaq } from "@/components/home-faq";
import { HomeStatsCounter } from "@/components/home-stats-counter";
import { ServiceSearch } from "@/components/service-search";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedHomeTenders } from "@/lib/home-featured-tenders";
import { getHomeStats } from "@/lib/home-stats";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";
import Image from "next/image";

const heroBadges = [
  { icon: ShieldCheck, label: "Փակ առաջարկներ" },
  { icon: Zap, label: "Արագ համեմատություն" },
  { icon: BadgeCheck, label: "Ստուգված մասնագետներ" },
];

const heroQuickStats = [
  { value: "0 ֏", label: "Մրցույթ տեղադրելը անվճար է" },
  { value: "24/7", label: "Հասանելի հարթակ" },
  { value: "3", label: "Անվճար մասնակցություն մասնագետին" },
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

const trustPoints = [
  {
    icon: Accessibility,
    title: "Մատչելի համակարգ",
    description:
      "Պարզ քայլեր, հասկանալի կանոններ և հարթակ, որտեղ և՛ պատվիրատուն, և՛ մասնագետը արագ կողմնորսվում են։",
  },
  {
    icon: ShieldCheck,
    title: "Վստահելի զուգակցություն",
    description:
      "Փակ առաջարկներ, իրական պրոֆիլներ և կարծիքներ՝ որոշում կայացնելիս ավելի քիչ ռիսկով։",
  },
  {
    icon: Zap,
    title: "Արագ արդյունք",
    description:
      "Հստակ վերջնաժամկետներ և կառուցվածքային առաջարկներ՝ ժամանակ չկորցնելով անընդհատ որոնումների մեջ։",
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

const oldWay = [
  "Ինստագրամում ու Ֆեյսբուքում որոնում, անձամբ զանգեր, անհայտ գներ։",
  "Մասնագետները խոստանում են «ամեն ինչ կանենք», իրականում սպասում ես շաբաթներով։",
  "Չկա մեկ տեղ, որտեղ երևան մինչև վերջ ավարտված աշխատանքներն ու կարծիքները։",
  "Համեմատությունը անհարմար է՝ յուրաքանչյուր մասնագետի հետ առանձին նամակագրություն։",
];

const tendWay = [
  "Մեկ կառուցվածքային մրցույթ՝ բյուջեով, ժամկետով և նկարներով։",
  "Մասնագետներն ավտոմատ տեսնում են առաջարկը և մրցում փակ առաջարկներով։",
  "Ամեն մասնագետի համար տեսնում ես վարկանիշ, ավարտված մրցույթներ և կարծիքներ։",
  "Բոլոր առաջարկները՝ մեկ պատկերում՝ գին, ժամկետ, փորձ, նամակ։",
];

export default async function Home() {
  const [categories, featuredTenders, stats] = await Promise.all([
    getServiceCategories(),
    getFeaturedHomeTenders(5),
    getHomeStats(),
  ]);

  const hasStats =
    stats.activeTenders > 0 ||
    stats.completedTenders > 0 ||
    stats.totalBids > 0 ||
    stats.providers > 0;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main>
        {/* HERO ------------------------------------------------------------ */}
        <section className="relative">
          <div
            aria-hidden
            className="tend-grid-pattern pointer-events-none absolute inset-0 -z-10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-amber-300/35 blur-3xl"
            style={{ animation: "tend-pulse-soft 9s ease-in-out infinite" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-40 -z-10 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
            style={{ animation: "tend-float 12s ease-in-out infinite" }}
          />

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ServiceSearch categories={categories} />
          </div>

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-16">
            <div className="flex flex-col justify-center">
              <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-bold text-amber-800 shadow-sm backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-600" />
                </span>
                Հայաստանի առաջին խելացի մրցույթների հարթակը
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
                Գտեք ճիշտ մասնագետին՝{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">առանց ժամանակ</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full bg-amber-300/80 sm:h-4 lg:h-5"
                  />
                </span>{" "}
                կորցնելու։
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:mt-7 sm:text-xl">
                Tend.am-ը կապում է պատվիրատուներին և ստուգված մասնագետներին։
                Տեղադրեք աշխատանքը անվճար, ստացեք փակ առաջարկներ և ընտրեք
                լավագույն կատարողին՝ թափանցիկ գործընթացով։
              </p>

              <div
                id="start"
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4"
              >
                <Link
                  href={ROUTES.createTender}
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
                >
                  Տեղադրել մրցույթ
                  <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href={ROUTES.tenders}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  Դիտել ակտիվ մրցույթները
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {heroBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm backdrop-blur"
                    >
                      <Icon className="size-3.5 text-amber-700" />
                      {badge.label}
                    </span>
                  );
                })}
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3">
                {heroQuickStats.map((stat) => (
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
              <div
                aria-hidden
                className="absolute -inset-4 -z-10 rounded-[3rem] bg-linear-to-br from-amber-200/60 via-white/40 to-transparent blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 -z-10 hidden h-32 w-32 rounded-3xl border border-amber-200/80 bg-amber-50 shadow-xl lg:block"
                style={{ animation: "tend-float 7s ease-in-out infinite" }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-8 -left-6 -z-10 hidden h-24 w-24 rounded-2xl border border-slate-200 bg-white shadow-xl lg:block"
                style={{ animation: "tend-float 9s ease-in-out infinite reverse" }}
              />
              <FeaturedTenderSlider tenders={featuredTenders} />
            </div>
          </div>
        </section>

        {/* CATEGORIES MARQUEE --------------------------------------------- */}
        <HomeCategoriesMarquee categories={categories} />

        {/* LIVE PLATFORM STATS -------------------------------------------- */}
        {hasStats ? (
          <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-950/5 ring-1 ring-slate-200 sm:p-10">
              <div
                aria-hidden
                className="tend-dot-pattern pointer-events-none absolute inset-0 opacity-40"
              />
              <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                    Tend.am թվերով
                  </p>
                  <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                    Իրական հարթակ, իրական մարդիկ, իրական աշխատանք։
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    Թվերը թարմացվում են ուղիղ տվյալների բազայից։ Ինչքան մեծանում է
                    համայնքը, այնքան ավելի լավ առաջարկներ եք ստանում։
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    icon={Gavel}
                    label="Ակտիվ մրցույթ"
                    value={stats.activeTenders}
                  />
                  <StatCard
                    icon={Send}
                    label="Ուղարկված առաջարկ"
                    value={stats.totalBids}
                  />
                  <StatCard
                    icon={Users}
                    label="Ակտիվ մասնագետ"
                    value={stats.providers}
                  />
                  <StatCard
                    icon={BadgeCheck}
                    label="Փակված մրցույթ"
                    value={stats.completedTenders}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* HOW IT WORKS ---------------------------------------------------- */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
                Ինչպես է աշխատում
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Երեք պարզ քայլ՝ գաղափարից մինչև պայմանագիր։
              </h2>
            </div>
            <Link
              href={ROUTES.sections.howItWorks}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-400 hover:text-slate-950"
            >
              Մանրամասն
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="relative mt-12">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-14 hidden h-1 rounded-full bg-linear-to-r from-amber-200 via-amber-300 to-amber-200 md:block"
            />
            <div className="relative grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.title}
                    className="group relative rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-2xl hover:ring-amber-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition group-hover:bg-amber-400 group-hover:text-slate-950">
                        <Icon className="size-6" />
                      </span>
                      <span className="text-5xl font-black text-slate-100 transition group-hover:text-amber-100">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-7 text-2xl font-black">{step.title}</h3>
                    <p className="mt-4 leading-7 text-slate-600">
                      {step.description}
                    </p>
                    {index < steps.length - 1 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-3 top-12 hidden size-6 place-items-center rounded-full bg-amber-300 text-slate-950 shadow md:grid"
                      >
                        <ArrowRight className="size-3.5" />
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* TRUST ----------------------------------------------------------- */}
        <section
          id="trust"
          aria-labelledby="trust-heading"
          className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_20%,rgba(251,191,36,0.18),transparent_55%)]" />
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
            <div className="order-2 lg:order-1">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
                Վստահություն և համագործակցություն
              </p>
              <h2
                id="trust-heading"
                className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
              >
                Մենք մոտ ենք քեզ՝ մատչելի, վստահելի և արագ։
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Tend.am-ը ցույց է տալիս, որ հարթակը կառուցված է մարդկանց միջև
                բարեհաջող կապի շուրջ՝ պատվիրատուին և մասնագետին միասին բերելով
                պարզ, թափանցիկ գործընթացով։
              </p>
              <ul className="mt-10 space-y-6">
                {trustPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="flex gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-900 ring-1 ring-amber-200/80">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-slate-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200/80 h-[300px] sm:h-[500px]">
                <div className="absolute inset-0 -z-10 bg-linear-to-br from-amber-50/30 via-white to-slate-50 " />
                <div className="relative aspect-video w-full">
                  <video
                    className="absolute inset-0 w-full object-cover h-[300px] sm:h-[500px]"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-label="Պատվիրատու և մասնագետ՝ բարեհաջող համաձայնություն, վստահություն և ջերմ հույզեր"
                  >
                    <source src="/home-trust-collab.mp4" type="video/mp4" />
                  </video>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-linear-to-t from-slate-950/85 via-slate-950/40 to-transparent p-5 text-xs font-black text-white sm:p-6 sm:text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
                    <ShieldCheck className="size-3.5 text-amber-300" />
                    Անվտանգ համագործակցություն
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
                    <Star className="size-3.5 fill-amber-300 text-amber-300" />
                    Իրական կարծիքներ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES (dark) ------------------------------------------------- */}
        <section
          id="features"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 lg:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
            />

            <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
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
                <Link
                  href={ROUTES.createTender}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-300"
                >
                  Տեղադրել մրցույթ հիմա
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <article
                      key={feature.title}
                      className="group rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur transition hover:-translate-y-1 hover:bg-white/10 hover:ring-amber-300/40"
                    >
                      <div className="grid size-12 place-items-center rounded-2xl bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/30">
                        <Icon className="size-6" />
                      </div>
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

        {/* COMPARISON ------------------------------------------------------ */}
        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
              Հին vs Նոր
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Մոռացեք հին որոնման մեթոդը։
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Տեսեք, թե ինչպես է Tend.am-ը փոխում մասնագետ գտնելու փորձառությունը։
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="relative rounded-4xl bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:p-10">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                  <XCircle className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
                    Հին ձևով
                  </p>
                  <h3 className="text-2xl font-black text-slate-950">
                    Քաոս և անորոշություն
                  </h3>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                {oldWay.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-slate-600 sm:text-base"
                  >
                    <XCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="relative overflow-hidden rounded-4xl bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-800 lg:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-10 h-60 w-60 rounded-full bg-amber-400/20 blur-3xl"
              />
              <div className="relative flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-amber-300 text-slate-950 ring-1 ring-amber-400/60">
                  <CheckCircle2 className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                    Tend.am-ով
                  </p>
                  <h3 className="text-2xl font-black">
                    Կառուցվածք և թափանցիկություն
                  </h3>
                </div>
              </div>
              <ul className="relative mt-7 space-y-4">
                {tendWay.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-slate-200 sm:text-base"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={ROUTES.createTender}
                className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Փորձել Tend.am-ով
                <ArrowRight className="size-4" />
              </Link>
            </article>
          </div>
        </section>

        {/* CUSTOMERS vs PROVIDERS ----------------------------------------- */}
        <section
          id="providers"
          className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8"
        >
          <div className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-2xl lg:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl transition group-hover:bg-amber-200/50"
            />
            <div className="relative">
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
              <ul className="mt-7 space-y-3">
                {[
                  "Բյուջեի վերահսկողություն և համեմատություն",
                  "Անձնական դեպք-մենեջեր լուրջ պատվերների համար",
                  "Անվճար մրցույթ՝ առանց թաքնված միջնորդավճարների",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm font-semibold text-slate-700 sm:text-base"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={ROUTES.createTender}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Տեղադրել անվճար մրցույթ
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-[2.5rem] bg-amber-300 p-8 shadow-xl shadow-amber-900/10 transition hover:-translate-y-1 hover:shadow-2xl lg:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-white/30 blur-3xl"
            />
            <div className="relative">
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
                բաժանորդագրության ամսական սահմանաչափից։ Փակ առաջարկների
                համակարգը պահում է մրցակցությունը արդար։
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Առաջին 3 առաջարկն ամբողջությամբ անվճար են",
                  "Ամսական փաթեթ՝ ակտիվ մասնագետների համար",
                  "Տեսանելի վարկանիշ և ավարտված մրցույթներ",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm font-semibold text-slate-900 sm:text-base"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-slate-950" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={ROUTES.register}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Դառնալ մասնագետ
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ------------------------------------------------------------- */}
        <HomeFaq />

        {/* FINAL CTA ------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-amber-300 via-amber-200 to-amber-300 p-8 shadow-2xl shadow-amber-500/20 sm:p-14 lg:p-20">
            <div
              aria-hidden
              className="tend-dot-pattern pointer-events-none absolute inset-0 opacity-30"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/40 blur-3xl"
              style={{ animation: "tend-pulse-soft 8s ease-in-out infinite" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-slate-950/10 blur-3xl"
            />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-200">
                  <TrendingUp className="size-3.5" />
                  Պատրաստ ե՞ք սկսել
                </span>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Տեղադրեք ձեր առաջին մրցույթը հենց հիմա։
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-900 sm:text-lg">
                  Ընդամենը մի քանի րոպե, և մասնագետները կուղարկեն փակ
                  առաջարկներ՝ գին, ժամկետ ու ուղեկցող նամակ։ Ընտրեք լավագույնը։
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href={ROUTES.createTender}
                    className="group inline-flex items-center justify-center gap-3 rounded-full bg-slate-950 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-slate-800"
                  >
                    Տեղադրել մրցույթ
                    <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href={ROUTES.tenders}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white/80 px-7 py-4 text-base font-bold text-slate-950 backdrop-blur transition hover:-translate-y-1 hover:bg-white"
                  >
                    Տեսնել մրցույթները
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-900/80">
                  Քարտ չի պահանջվում · Անվճար գրանցում · 2 րոպեում պատրաստ
                </p>
              </div>

              <div className="relative hidden lg:block">
                <div
                  aria-hidden
                  className="absolute right-6 top-6 h-40 w-56 rotate-3 rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200"
                  style={{ animation: "tend-float 9s ease-in-out infinite" }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    <Send className="size-3.5" /> Նոր առաջարկ
                  </div>
                  <p className="mt-3 text-lg font-black text-slate-950">
                    85 000 ֏
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    3 օրում · Արամ Մ.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-amber-500">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="size-3 fill-amber-400" />
                    ))}
                    <span className="ml-1 text-xs font-black text-slate-700">
                      4.9
                    </span>
                  </div>
                </div>
                <div
                  aria-hidden
                  className="absolute right-44 top-40 h-32 w-48 -rotate-3 rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/30"
                  style={{ animation: "tend-float 11s ease-in-out infinite reverse" }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                    <MessageCircle className="size-3.5" /> Նամակ
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-5">
                    «Ունեմ 6 տարվա փորձ նմանատիպ նախագծերում»
                  </p>
                </div>
                <div
                  aria-hidden
                  className="absolute right-10 top-64 h-24 w-44 rotate-2 rounded-3xl bg-white p-4 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200"
                  style={{ animation: "tend-float 10s ease-in-out infinite" }}
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    <CheckCircle2 className="size-3.5" /> Ընտրված
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    Մրցույթը փակվեց
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Կատարողն ընտրված է
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link
                href={ROUTES.home}
                className="inline-flex items-center gap-3"
                aria-label="Tend.am"
              >
                {/* <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-xl shadow-slate-950/20">
                  T
                </span> */}

                <Image src="/icons/logo.svg" alt="Tend.am" width={100} height={100} />
                <span className="text-xl font-black tracking-tight">
                  Tend.am
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                Հայաստանի առաջին խելացի մրցույթների հարթակը՝ ստուգված
                մասնագետներով, փակ առաջարկներով և թափանցիկ պայմաններով։
              </p>
            </div>

            <FooterColumn
              title="Հարթակ"
              links={[
                { label: "Մրցույթներ", href: ROUTES.tenders },
                { label: "Ոլորտներ", href: ROUTES.categories },
                {
                  label: "Ինչպես է աշխատում",
                  href: ROUTES.sections.howItWorks,
                },
                { label: "Տեղադրել մրցույթ", href: ROUTES.createTender },
              ]}
            />

            <FooterColumn
              title="Հաշիվ"
              links={[
                { label: "Մուտք", href: ROUTES.login },
                { label: "Գրանցում", href: ROUTES.register },
                { label: "Գաղտնաբառի վերականգնում", href: ROUTES.forgotPassword },
              ]}
            />

            <FooterColumn
              title="Իրավական"
              links={[
                { label: "Գաղտնիության քաղաքականություն", href: ROUTES.privacy },
                { label: "Օգտագործման պայմաններ", href: ROUTES.terms },
              ]}
            />
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Tend.am. Բոլոր իրավունքները պաշտպանված են։</p>
            <p>Պատրաստված է Հայաստանի շուկայի համար ❤︎</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gavel;
  label: string;
  value: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-white to-amber-50 p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-amber-300 shadow-md shadow-slate-950/20">
          <Icon className="size-5" />
        </span>
        <Layers3 className="size-4 text-slate-300" />
      </div>
      <div className="mt-5 text-3xl font-black text-slate-950 sm:text-4xl">
        <HomeStatsCounter value={value} suffix="+" />
      </div>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="transition hover:text-slate-950"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
