/** Մինչև 10 ոլորտ/ծառայությունների զտման ընտրություն URL `picks` պարամետրով (JSON, encodeURIComponent)։ */

export const MAX_CATALOG_PICKS = 10;

export type CatalogFilterSelection = {
  categoryTitle: string;
  serviceTitle: string | null;
};

function pickKey(p: CatalogFilterSelection) {
  return `${p.categoryTitle}::${p.serviceTitle ?? ""}`;
}

function normalizePick(item: unknown): CatalogFilterSelection | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const c = typeof raw.categoryTitle === "string" ? raw.categoryTitle.trim() : "";
  if (!c || c.length > 255) return null;
  const st =
    typeof raw.serviceTitle === "string" && raw.serviceTitle.trim().length > 0
      ? raw.serviceTitle.trim().slice(0, 255)
      : null;
  return { categoryTitle: c.slice(0, 255), serviceTitle: st };
}

export function parseCatalogPicksParam(
  raw: string | undefined | null,
): CatalogFilterSelection[] {
  if (!raw?.trim()) return [];
  try {
    const decoded = decodeURIComponent(raw.trim());
    const parsed = JSON.parse(decoded) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CatalogFilterSelection[] = [];
    const seen = new Set<string>();
    for (const el of parsed) {
      if (out.length >= MAX_CATALOG_PICKS) break;
      const n = normalizePick(el);
      if (!n) continue;
      const k = pickKey(n);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeCatalogPicks(picks: CatalogFilterSelection[]): string {
  return encodeURIComponent(
    JSON.stringify(picks.slice(0, MAX_CATALOG_PICKS)),
  );
}

export function mergeCatalogPicksFromLegacy(
  fromParam: CatalogFilterSelection[],
  category: string,
  service: string,
): CatalogFilterSelection[] {
  if (fromParam.length > 0) return fromParam;
  const c = category.trim();
  if (!c) return [];
  const s = service.trim();
  return [
    {
      categoryTitle: c.slice(0, 255),
      serviceTitle: s.length > 0 ? s.slice(0, 255) : null,
    },
  ];
}
