/** Կանոնականացնում է հայկական հեռախոսը `+374XXXXXXXX` (12 նիշ)։ */
export function normalizeArmenianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  let local = digits;

  if (local.startsWith("374")) {
    local = local.slice(3);
  } else if (local.startsWith("0")) {
    local = local.slice(1);
  }

  if (local.length !== 8) {
    return null;
  }

  return `+374${local}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeArmenianPhone(a);
  const nb = normalizeArmenianPhone(b);

  return na !== null && nb !== null && na === nb;
}

/** Ցուցադրման համար՝ `+374 77 123 456` */
export function formatArmenianPhoneDisplay(value: string): string {
  const normalized = normalizeArmenianPhone(value);
  if (!normalized) {
    return value.trim();
  }

  const local = normalized.slice(4);
  const operator = local.slice(0, 2);
  const first = local.slice(2, 5);
  const second = local.slice(5, 8);

  return `+374 ${operator} ${first} ${second}`.trim();
}

/** `+374 77 *** 56` */
export function maskArmenianPhone(value: string): string {
  const normalized = normalizeArmenianPhone(value);
  if (!normalized) {
    return value.trim();
  }

  const local = normalized.slice(4);
  return `+374 ${local.slice(0, 2)} *** ${local.slice(-2)}`;
}

export function isValidArmenianPhone(value: string): boolean {
  return normalizeArmenianPhone(value) !== null;
}
