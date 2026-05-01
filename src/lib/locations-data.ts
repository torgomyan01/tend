import { prisma } from "@/lib/prisma";

export type LocationPickerOption = {
  id: number;
  label: string;
};

export type LocationRow = {
  id: number;
  name: string;
  parentId: number | null;
};

export function buildLocationBreadcrumb(
  locationId: number,
  rows: LocationRow[],
): string | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const parts: string[] = [];
  let current: number | null = locationId;
  const guard = new Set<number>();

  while (current !== null) {
    if (guard.has(current)) {
      return null;
    }
    guard.add(current);
    const row = byId.get(current);
    if (!row) {
      return null;
    }
    parts.unshift(row.name);
    current = row.parentId;
  }

  return parts.length > 0 ? parts.join(" › ") : null;
}

export async function getLocationPickerOptions(): Promise<LocationPickerOption[]> {
  const rows = await prisma.location.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { id: "asc" },
  });

  if (rows.length === 0) {
    return [];
  }

  return rows
    .map((row) => ({
      id: row.id,
      label: buildLocationBreadcrumb(row.id, rows) ?? row.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "hy"));
}

export async function resolveLocationCityLabel(locationId: number): Promise<string | null> {
  const rows = await prisma.location.findMany({
    select: { id: true, name: true, parentId: true },
  });
  return buildLocationBreadcrumb(locationId, rows);
}
