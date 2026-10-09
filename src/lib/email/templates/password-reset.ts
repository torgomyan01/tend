import { renderEmailLayout } from "@/lib/email/templates/layout";

export function renderPasswordResetEmailTemplate(params: {
  name: string | null;
  resetUrl: string;
  expiresLabel: string;
}) {
  const greeting = params.name?.trim()
    ? `Բարև, <strong>${params.name.trim()}</strong>։`
    : "Բարև։";

  const bodyHtml = [
    `<p style="margin: 0 0 16px;">${greeting}</p>`,
    `<p style="margin: 0 0 16px;">`,
    `Ստացել ենք Tend.am գաղտնաբառի վերականգնման հարցում։`,
    ` Սեղմեք ստորևի կոճակը՝ նոր գաղտնաբառ սահմանելու համար։`,
    `</p>`,
    `<p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">`,
    `Հղումը գործում է մինչև <strong>${params.expiresLabel}</strong>։`,
    `</p>`,
    `<p style="margin: 0; font-size: 13px; color: #64748b;">`,
    `Եթե դուք չեք խնդրել վերականգնում, կարող եք անտեսել այս նամակը։`,
    `</p>`,
  ].join("");

  return renderEmailLayout({
    previewText: "Վերականգնեք Tend.am գաղտնաբառը",
    title: "Գաղտնաբառի վերականգնում",
    bodyHtml,
    ctaLabel: "Վերականգնել գաղտնաբառը",
    ctaUrl: params.resetUrl,
  });
}
