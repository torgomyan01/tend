/** SEO description clamp for meta tags (~155–160 chars). */
export function truncateMetaDescription(
  text: string,
  max = 158,
): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  const sliced = oneLine.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trimEnd()}…`;
}

/** Strip HTML-ish / markdown noise for plain meta text. */
export function plainTextSnippet(text: string, max = 158): string {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncateMetaDescription(plain, max);
}
