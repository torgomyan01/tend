import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { ROUTES } from "@/lib/routes";
import {
  PAGE_SEO,
  SITE_DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_SLOGAN,
  SITE_SUPPORT_EMAIL,
  siteSameAsProfiles,
  siteSupportTelephone,
} from "@/lib/seo/site";

export type JsonLd = Record<string, unknown>;

export function organizationGraph(): JsonLd {
  const logoUrl = absoluteAppUrl("/icons/logo.svg");
  const telephone = siteSupportTelephone();
  const sameAs = siteSameAsProfiles();

  const org: JsonLd = {
    "@type": ["Organization", "OnlineBusiness"],
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    legalName: SITE_NAME,
    alternateName: ["Tend", "Tend AM", "tend.am"],
    url: SITE_ORIGIN,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE_ORIGIN}/#logo`,
      url: logoUrl,
      contentUrl: logoUrl,
      caption: SITE_NAME,
    },
    image: { "@id": `${SITE_ORIGIN}/#logo` },
    description: SITE_DEFAULT_DESCRIPTION,
    slogan: SITE_SLOGAN,
    email: SITE_SUPPORT_EMAIL,
    areaServed: {
      "@type": "Country",
      name: "Armenia",
      identifier: "AM",
    },
    knowsLanguage: ["hy", "ru", "en"],
    availableLanguage: ["hy-AM", "ru", "en"],
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
      logo: { "@id": `${SITE_ORIGIN}/#logo` },
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE_SUPPORT_EMAIL,
        ...(telephone ? { telephone } : {}),
        areaServed: "AM",
        availableLanguage: ["Armenian", "Russian", "English"],
        url: absoluteAppUrl(ROUTES.howItWorks),
      },
    ],
    termsOfService: absoluteAppUrl(ROUTES.terms),
    publishingPrinciples: absoluteAppUrl(ROUTES.privacy),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Ոլորտներ և ծառայություններ",
      url: absoluteAppUrl(ROUTES.categories),
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Ակտիվ մրցույթներ",
          url: absoluteAppUrl(ROUTES.tenders),
        },
      ],
    },
    makesOffer: {
      "@type": "Offer",
      name: "Մրցույթ տեղադրել",
      url: absoluteAppUrl(ROUTES.createTender),
      price: 0,
      priceCurrency: "AMD",
      description: "Մրցույթ հայտարարելը Tend.am-ում անվճար է։",
      availability: "https://schema.org/InStock",
    },
  };

  if (telephone) {
    org.telephone = telephone;
  }
  if (sameAs.length > 0) {
    org.sameAs = sameAs;
  }

  return org;
}

export function websiteWithSearchAction(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    inLanguage: "hy-AM",
    description: SITE_DEFAULT_DESCRIPTION,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    copyrightHolder: { "@id": `${SITE_ORIGIN}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteAppUrl(ROUTES.tenders)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function siteGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationGraph(), websiteWithSearchAction()],
  };
}

export function faqPage(items: Array<{ q: string; a: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbList(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteAppUrl(item.path),
    })),
  };
}

export function collectionPage(params: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: params.name,
    description: params.description,
    url: absoluteAppUrl(params.path),
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "hy-AM",
  };
}

export function webPage(params: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: params.name,
    description: params.description,
    url: absoluteAppUrl(params.path),
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "hy-AM",
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
  };
}

/**
 * Ակտիվ մրցույթ = Demand (պահանջ ծառայության համար) + Service itemOffered.
 * JobPosting չենք օգտագործում՝ աշխատանքի հայտարարություն չէ։
 */
export function tenderService(params: {
  id: string;
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  city?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  endsAt?: string | Date | null;
  categoryName?: string | null;
  datePublished?: string | Date | null;
}): JsonLd {
  const url = absoluteAppUrl(params.path);
  const areaServed = params.city
    ? { "@type": "Place", name: params.city }
    : { "@type": "Country", name: "Armenia", identifier: "AM" };

  const service: JsonLd = {
    "@type": "Service",
    "@id": `${url}#service`,
    name: params.title,
    description: params.description,
    areaServed,
  };

  if (params.categoryName) {
    service.category = params.categoryName;
    service.serviceType = params.categoryName;
  }

  const priceSpec: JsonLd = {
    "@type": "PriceSpecification",
    priceCurrency: "AMD",
  };
  if (
    params.budgetMin != null &&
    Number.isFinite(params.budgetMin) &&
    params.budgetMin > 0
  ) {
    priceSpec.minPrice = params.budgetMin;
  }
  if (
    params.budgetMax != null &&
    Number.isFinite(params.budgetMax) &&
    params.budgetMax > 0
  ) {
    priceSpec.maxPrice = params.budgetMax;
  } else if (
    params.budgetMin != null &&
    Number.isFinite(params.budgetMin) &&
    params.budgetMin > 0
  ) {
    priceSpec.price = params.budgetMin;
  }

  const demand: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Demand",
    "@id": `${url}#demand`,
    name: params.title,
    description: params.description,
    url,
    itemOffered: service,
    areaServed,
    businessFunction: "https://schema.org/ProvideService",
    priceSpecification: priceSpec,
  };

  if (params.imageUrl) {
    const image = params.imageUrl.startsWith("http")
      ? params.imageUrl
      : absoluteAppUrl(params.imageUrl);
    demand.image = image;
    service.image = image;
  }

  if (params.endsAt) {
    demand.validThrough = new Date(params.endsAt).toISOString();
  }

  if (params.datePublished) {
    demand.datePublished = new Date(params.datePublished).toISOString();
  }

  return demand;
}

export function profilePerson(params: {
  name: string;
  path: string;
  description?: string;
  imageUrl?: string | null;
  accountType?: "INDIVIDUAL" | "COMPANY" | string;
  companyName?: string | null;
}): JsonLd {
  const url = absoluteAppUrl(params.path);
  const isOrg =
    params.accountType === "COMPANY" || Boolean(params.companyName?.trim());

  const entity: JsonLd = isOrg
    ? {
        "@type": "Organization",
        name: params.companyName?.trim() || params.name,
        url,
      }
    : {
        "@type": "Person",
        name: params.name,
        url,
      };

  if (params.description) {
    entity.description = params.description;
  }
  if (params.imageUrl) {
    entity.image = params.imageUrl.startsWith("http")
      ? params.imageUrl
      : absoluteAppUrl(params.imageUrl);
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: params.name,
    url,
    mainEntity: entity,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    inLanguage: "hy-AM",
  };
}

/** Գլխավոր էջի WebPage (FAQ-ից բացի) */
export function homeWebPage(): JsonLd {
  return webPage({
    name: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    path: ROUTES.home,
  });
}
