/**
 * Հանրային SEO — robots.txt disallow ուղիներ (բոլոր bot-ների համար)։
 */
export const ROBOTS_DISALLOW_PATHS = [
  "/admin",
  "/account",
  "/api",
  "/tenders/new",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/*/edit",
  "/*/review",
] as const;

/** Միայն ուսուցման/սքրեյպի training bot-ներ — հանրային բովանդակությունը թույլատրել չենք։ */
export const ROBOTS_TRAINING_ONLY_DISALLOW_USER_AGENTS = [
  "Google-Extended",
  "Applebot-Extended",
] as const;

/** Որոնողական և AI-assistant bot-ներ — նույն հանրային կանոնները, ինչ Googlebot-ը։ */
export const ROBOTS_SEARCH_AND_AI_ASSISTANT_AGENTS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
] as const;
