/** Անվան ընդհատված տարբերակ հանրային էջի համար (լրիվ անուն չի ցուցադրվում)։ */
export function maskApplicantDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "Մասնագետ ***";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0];
  if (!firstInitial) {
    return "Մասնագետ ***";
  }

  if (parts.length >= 2) {
    const secondInitial = parts[1]?.[0];
    return secondInitial
      ? `${firstInitial}. ${secondInitial}. ***`
      : `${firstInitial}. ***`;
  }

  return `${firstInitial}. ***`;
}

export function initialsFromMasked(masked: string): string {
  const dotted = masked.match(/^(.)\./);
  if (dotted?.[1]) {
    return dotted[1].toUpperCase();
  }
  const first = masked.trim()[0];
  return first ? first.toUpperCase() : "?";
}

/** Անուն ազգանունից՝ ավատարի համարակալ (մինչև 2 տառ)։ */
export function initialsFromName(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    const ch = parts[0][0];
    return ch ? ch.toUpperCase() : "?";
  }
  const a = parts[0][0];
  const b = parts[1][0];
  return a && b ? `${a}${b}`.toUpperCase() : "?";
}

/** Ուղեկից նամակից առաջին բառերը՝ առանց լրիվ բովանդակության։ */
export function coverLetterSnippet(
  text: string,
  maxWords = 7,
): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "…";
  }

  const slice = words.slice(0, maxWords).join(" ");
  return words.length > maxWords ? `${slice}…` : slice;
}
