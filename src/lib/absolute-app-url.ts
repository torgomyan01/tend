import { ROUTES } from "@/lib/routes";

/**
 * Կայքի հիմնական հանրային հասցեն՝ մեկ տեղ։
 * localhost / 127.0.0.1 հղումները փոխարինվում են այսով (Telegram, արտաքին notify)։
 */
export const SITE_PUBLIC_ORIGIN = "https://tend.am";

/** Ստանդարտize origin (պրոտոկոլ, վերջի /). */
function normalizeOrigin(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) {
    return "";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(t)) {
    return `http://${t}`;
  }
  return `https://${t}`;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "::1"
    );
  } catch {
    return false;
  }
}

/**
 * Բաց կետ՝ Telegram, email, notify։
 * Env հերթ՝ NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, VERCEL_URL (լոկալը անտեսվում է)։
 * Վերջապես՝ SITE_PUBLIC_ORIGIN։
 */
export function resolvePublicAppOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ];

  for (const c of candidates) {
    const o = normalizeOrigin(c ?? "");
    if (o && !isLocalOrigin(o)) {
      return o;
    }
  }

  return SITE_PUBLIC_ORIGIN;
}

/** Բաց կետ՝ Telegram և այլ արտաքին հղումների համար։ */
export function absoluteAppUrl(path: string): string {
  const origin = resolvePublicAppOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/$/, "")}${normalized}`;
}

/**
 * Origin for the current browser request — keeps localhost in local/dev.
 * Used for VPOS backURL so payment return lands on the same host the user came from.
 */
export function resolveAppOriginFromRequest(request: Request): string {
  const fromReq = resolveBrowserOriginFromRequest(request);
  if (fromReq) {
    return fromReq;
  }

  if (process.env.NODE_ENV !== "production") {
    for (const c of [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXTAUTH_URL,
    ]) {
      const o = normalizeOrigin(c ?? "");
      if (o) {
        return o;
      }
    }
  }

  return resolvePublicAppOrigin();
}

/** Absolute URL on the same host as the request (localhost locally, tend.am in prod). */
export function absoluteAppUrlFromRequest(path: string, request: Request): string {
  const origin = resolveAppOriginFromRequest(request);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/$/, "")}${normalized}`;
}

export function tenderReviewAbsoluteUrl(tenderId: string): string {
  return absoluteAppUrl(ROUTES.tenderReview(tenderId));
}

/**
 * Բրաուզերի/proxy հիմք՝ նույն հարցման համար։
 * Լոկալ մշակման միջավայրում կարող է վերադարձնել localhost։
 */
export function resolveBrowserOriginFromRequest(request: Request): string | null {
  const originHeader = request.headers.get("origin");
  if (originHeader && /^https?:\/\//i.test(originHeader.trim())) {
    try {
      const u = new URL(originHeader.trim());
      return normalizeOrigin(`${u.protocol}//${u.host}`);
    } catch {
      /* continue */
    }
  }

  const referer = request.headers.get("referer");
  if (referer?.trim()) {
    try {
      const u = new URL(referer.trim());
      return normalizeOrigin(`${u.protocol}//${u.host}`);
    } catch {
      /* continue */
    }
  }

  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();
  if (xfHost) {
    const proto =
      xfProto === "http" || xfProto === "https" ? xfProto : "https";
    return normalizeOrigin(`${proto}://${xfHost}`);
  }

  const host = request.headers.get("host")?.trim();
  if (!host) {
    return null;
  }

  const local =
    /^localhost\b/i.test(host) ||
    /^127\.0\.0\.1\b/.test(host) ||
    host.startsWith("[::1]");
  const proto = local ? "http" : "https";
  return normalizeOrigin(`${proto}://${host}`);
}

/** Գնահատման հղում notify-ների համար՝ երբեք localhost չի մնում, միշտ թենդ.am կամ ոչ-լոկալ env։ */
export function tenderReviewUrlForNotify(
  tenderId: string,
  request?: Request | null,
): string {
  const path = ROUTES.tenderReview(tenderId);
  const fromReq =
    request != null ? resolveBrowserOriginFromRequest(request) : null;

  const origin =
    fromReq && !isLocalOrigin(fromReq)
      ? fromReq
      : resolvePublicAppOrigin();

  const safeOrigin = isLocalOrigin(origin) ? SITE_PUBLIC_ORIGIN : origin;

  return `${safeOrigin.replace(/\/$/, "")}${path}`;
}
