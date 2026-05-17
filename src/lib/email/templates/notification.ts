import { renderEmailLayout } from "@/lib/email/templates/layout";

/** Ընդհանուր ծանուցման նամակ (նոր մրցույթ, առաջարկ, կարգավիճակ…) */
export function renderNotificationEmailTemplate(params: {
  title: string;
  previewText: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return renderEmailLayout({
    previewText: params.previewText,
    title: params.title,
    bodyHtml: params.bodyHtml,
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
    footerNote:
      "Դուք ստանում եք այս նամակը, քանի որ գրանցված եք Tend.am-ում։",
  });
}

/** Պարզ տեքստից HTML պարբերություններ (Telegram HTML-ի փոխարեն) */
export function plainTextToEmailHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      const withBreaks = trimmed.replace(/\n/g, "<br />");
      return `<p style="margin: 0 0 14px;">${withBreaks}</p>`;
    })
    .join("");
}
