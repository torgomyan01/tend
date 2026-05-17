import { renderEmailLayout } from "@/lib/email/templates/layout";

export function renderVerifyEmailTemplate(params: {
  name: string | null;
  verifyUrl: string;
}) {
  const greeting = params.name?.trim()
    ? `Բարև, <strong>${params.name.trim()}</strong>։`
    : "Բարև։";

  const bodyHtml = `
    <p style="margin: 0 0 16px;">${greeting}</p>
    <p style="margin: 0 0 16px;">
      Սեղմեք ստորևի կոճակը՝ ձեր Tend.am հաշիվը էլ․ փոստով հաստատելու համար։
      Հղումը վավեր է <strong>24 ժամ</strong>։
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Եթե դուք չեք գրանցվել Tend.am-ում, կարող եք անտեսել այս նամակը։
    </p>
  `;

  return renderEmailLayout({
    previewText: "Հաստատեք ձեր Tend.am հաշիվը",
    title: "Էլ․ փոստի հաստատում",
    bodyHtml,
    ctaLabel: "Հաստատել հաշիվը",
    ctaUrl: params.verifyUrl,
  });
}
