import type { Metadata } from "next";
import { absoluteAppUrl, resolvePublicAppOrigin } from "@/lib/absolute-app-url";
import {
  INDEX_FOLLOW,
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_OG_DESCRIPTION,
} from "@/lib/seo/site";
import { truncateMetaDescription } from "@/lib/seo/truncate";

type RobotsValue = NonNullable<Metadata["robots"]>;

export type BuildPageMetadataInput = {
  title: string;
  description?: string;
  /** Path starting with `/` (no query) for canonical + OG url */
  path: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  robots?: RobotsValue;
  /** Open Graph type */
  ogType?: "website" | "article" | "profile";
};

export function buildPageMetadata(
  input: BuildPageMetadataInput,
): Metadata {
  const description = truncateMetaDescription(
    input.description?.trim() || SITE_DEFAULT_DESCRIPTION,
  );
  const canonical = absoluteAppUrl(input.path);
  const images =
    input.images && input.images.length > 0
      ? input.images.map((img) => ({
          url: img.url.startsWith("http")
            ? img.url
            : absoluteAppUrl(img.url),
          width: img.width ?? 1200,
          height: img.height ?? 630,
          alt: img.alt ?? SITE_NAME,
        }))
      : [
          {
            url: absoluteAppUrl("/opengraph-image"),
            width: 1200,
            height: 630,
            alt: SITE_NAME,
          },
        ];

  return {
    title: input.title,
    description,
    applicationName: SITE_NAME,
    alternates: {
      canonical: input.path,
    },
    robots: input.robots ?? INDEX_FOLLOW,
    openGraph: {
      type: input.ogType ?? "website",
      locale: SITE_LOCALE,
      url: canonical,
      siteName: SITE_NAME,
      title: input.title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export function rootDefaultMetadata(): Metadata {
  return {
    metadataBase: new URL(resolvePublicAppOrigin()),
    title: {
      default: `${SITE_DEFAULT_TITLE} | ${SITE_NAME}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: {
      canonical: "/",
    },
    robots: INDEX_FOLLOW,
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      url: absoluteAppUrl("/"),
      siteName: SITE_NAME,
      title: `${SITE_DEFAULT_TITLE} | ${SITE_NAME}`,
      description: SITE_OG_DESCRIPTION,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_DEFAULT_TITLE} | ${SITE_NAME}`,
      description: SITE_OG_DESCRIPTION,
      images: ["/opengraph-image"],
    },
  };
}
