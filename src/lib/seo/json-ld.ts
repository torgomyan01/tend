import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { ROUTES } from "@/lib/routes";
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/seo/site";

export type JsonLd = Record<string, unknown>;

export function organizationGraph(): JsonLd {
  const logo = absoluteAppUrl("/icons/logo.svg");
  return {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: logo,
    },
    image: logo,
    description: SITE_DEFAULT_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Armenia",
    },
    sameAs: [] as string[],
  };
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
    inLanguage: "hy-AM",
  };
}

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
  const offer: JsonLd = {
    "@type": "Offer",
    url,
    priceCurrency: "AMD",
    availability: "https://schema.org/InStock",
  };

  if (
    params.budgetMin != null &&
    Number.isFinite(params.budgetMin) &&
    params.budgetMin > 0
  ) {
    offer.price = params.budgetMin;
  } else if (
    params.budgetMax != null &&
    Number.isFinite(params.budgetMax) &&
    params.budgetMax > 0
  ) {
    offer.price = params.budgetMax;
  }

  if (params.endsAt) {
    offer.validThrough = new Date(params.endsAt).toISOString();
  }

  const service: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: params.title,
    description: params.description,
    url,
    provider: { "@id": `${SITE_ORIGIN}/#organization` },
    areaServed: params.city
      ? { "@type": "Place", name: params.city }
      : { "@type": "Country", name: "Armenia" },
    offers: offer,
  };

  if (params.imageUrl) {
    service.image = params.imageUrl.startsWith("http")
      ? params.imageUrl
      : absoluteAppUrl(params.imageUrl);
  }

  if (params.categoryName) {
    service.category = params.categoryName;
  }

  if (params.datePublished) {
    service.datePublished = new Date(params.datePublished).toISOString();
  }

  return service;
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
