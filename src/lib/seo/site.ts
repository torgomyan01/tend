import { SITE_PUBLIC_ORIGIN } from "@/lib/absolute-app-url";

export const SITE_NAME = "Tend.am";

export const SITE_DEFAULT_TITLE =
  "Մրցույթ հայտարարել, առաջարկներ ստանալ, մասնագետ ընտրել";

export const SITE_DEFAULT_DESCRIPTION =
  "Tend.am — մրցույթների (tender) հարթակ Հայաստանում․ պատվիրատուները հայտարարում են մրցույթ, մասնագետները ուղարկում են առաջարկներ, դուք ընտրում եք լավագույնը։ Ստեղծեք մրցույթ, համեմատեք գներ և աշխատեք վստահելի մասնագետների հետ։";

export const SITE_OG_DESCRIPTION =
  "Հայաստանի մրցույթների հարթակ՝ փակ առաջարկներով, ստուգված մասնագետներով և թափանցիկ ընտրությամբ։";

export const SITE_LOCALE = "hy_AM";

export const SITE_ORIGIN = SITE_PUBLIC_ORIGIN;

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
