import { normalizeArmenianPhone } from "@/lib/phone";

export const SUPPORT_EMAIL = "info@tend.am";

export const SUPPORT_PHONES = [
  { display: "077 769668", dial: "077769668" },
  { display: "094263449", dial: "094263449" },
] as const;

export function supportPhoneHref(dial: string): string {
  const normalized = normalizeArmenianPhone(dial);
  return normalized ? `tel:${normalized}` : `tel:${dial}`;
}

export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`;
