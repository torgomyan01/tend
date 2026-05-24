import type { MetadataRoute } from "next";
import { resolvePublicAppOrigin } from "@/lib/absolute-app-url";
import {
  ROBOTS_DISALLOW_PATHS,
  ROBOTS_SEARCH_AND_AI_ASSISTANT_AGENTS,
  ROBOTS_TRAINING_ONLY_DISALLOW_USER_AGENTS,
} from "@/lib/seo/robots-rules";

function publicCrawlRules(userAgent: string | string[]) {
  return {
    userAgent,
    allow: "/",
    disallow: [...ROBOTS_DISALLOW_PATHS],
  };
}

export default function robots(): MetadataRoute.Robots {
  const origin = resolvePublicAppOrigin().replace(/\/$/, "");

  return {
    rules: [
      publicCrawlRules("*"),
      ...ROBOTS_SEARCH_AND_AI_ASSISTANT_AGENTS.map((agent) =>
        publicCrawlRules(agent),
      ),
      ...ROBOTS_TRAINING_ONLY_DISALLOW_USER_AGENTS.map((agent) => ({
        userAgent: agent,
        disallow: "/",
      })),
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
