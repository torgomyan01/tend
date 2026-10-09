import { SITE_PUBLIC_ORIGIN } from "@/lib/absolute-app-url";
import { SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/support-contact";
import { normalizeArmenianPhone } from "@/lib/phone";

export const SITE_NAME = "Tend.am";

/** Հիմնական SEO title (template-ը ավելացնում է «| Tend.am») */
export const SITE_DEFAULT_TITLE =
  "Անվճար մրցույթ Հայաստանում · մասնագետ և լավագույն գին";

export const SITE_DEFAULT_DESCRIPTION =
  "Տեղադրեք մրցույթ անվճար և ստացեք գներ ստուգված մասնագետներից՝ վերանորոգում, շինարարություն, IT և այլ աշխատանքներ Երևանում ու Հայաստանում։ Համեմատեք առաջարկները և ընտրեք կատարողին։";

export const SITE_OG_DESCRIPTION =
  "Անվճար մրցույթ · փակ գներ · ստուգված մասնագետներ Հայաստանում։ Գտեք կատարող կամ նոր պատվերներ մեկ հարթակում։";

export const SITE_SLOGAN =
  "Անվճար մրցույթ · ստացիր գներ · ընտրիր մասնագետ";

export const SITE_LOCALE = "hy_AM";

export const SITE_ORIGIN = SITE_PUBLIC_ORIGIN;

/** Հանրային էջերի մարկետինգային title/description */
export const PAGE_SEO = {
  home: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  tenders: {
    title: "Ակտիվ մրցույթներ Հայաստանում",
    description:
      "Գտեք ակտիվ մրցույթներ Հայաստանում՝ ըստ ոլորտի, քաղաքի և բյուջեի։ Մասնակցեք որպես մասնագետ կամ հետևեք նոր աշխատանքներին Tend.am-ում։",
    h1: "Ակտիվ մրցույթներ",
  },
  categories: {
    title: "Ոլորտներ և ծառայություններ",
    description:
      "Շինարարություն, վերանորոգում, IT, մաքրություն և այլ ոլորտներ։ Ընտրեք ծառայություն և գտեք համապատասխան մրցույթներ կամ հայտարարեք աշխատանք։",
  },
  providers: {
    title: "Մասնագետների համար · նոր պատվերներ",
    description:
      "Գտեք նոր պատվերներ Tend.am-ում՝ փակ առաջարկներով, պրոֆիլով, պորտֆոլիոյով և վարկանիշով։ Սկսեք մասնակցել մրցույթներին այսօր։",
  },
  howItWorks: {
    title: "Ինչպես է աշխատում մրցույթների հարթակը",
    description:
      "Քայլ առ քայլ՝ մրցույթ տեղադրել, փակ առաջարկներ ստանալ, համեմատել և ընտրել կատարող։ Տեսեք Tend.am-ի կանոններն ու առավելությունները։",
  },
  privacy: {
    title: "Գաղտնիության քաղաքականություն",
    description:
      "Ինչպես է Tend.am-ը հավաքում, պահում և պաշտպանում ձեր անձնական տվյալները։ Օգտատերերի իրավունքներ և կապ աջակցության հետ։",
  },
  terms: {
    title: "Օգտագործման պայմաններ",
    description:
      "Tend.am հարթակի կանոնները՝ մրցույթներ, վճարներ, պաշտպանված գործարք, մոդերացիա և պատասխանատվություն։ Կարդացեք մինչև գրանցվելը։",
  },
} as const;

/** Organization JSON-LD · աջակցության կոնտակտ */
export function siteSupportTelephone(): string | null {
  const first = SUPPORT_PHONES[0]?.dial;
  return first ? normalizeArmenianPhone(first) : null;
}

export const SITE_SUPPORT_EMAIL = SUPPORT_EMAIL;

/**
 * sameAs՝ միայն իրական հանրային պրոֆիլներ։
 * Լրացրեք env-ով՝ SEO_SAME_AS=https://t.me/...,https://www.facebook.com/...
 */
export function siteSameAsProfiles(): string[] {
  const raw = process.env.SEO_SAME_AS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export const NOINDEX_FOLLOW = {
  index: false,
  follow: true,
} as const;

export const NOINDEX_NOFOLLOW = {
  index: false,
  follow: false,
} as const;

export const INDEX_FOLLOW = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};
