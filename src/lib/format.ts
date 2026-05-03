/** Armenian short month labels — avoids SSR/client hydration mismatches from uneven hy-AM Intl support in browsers. */
const HY_MONTH_SHORT = [
  "Հնվ",
  "Փտր",
  "Մրտ",
  "Ապր",
  "Մյս",
  "Հուն",
  "Հուլ",
  "Օգս",
  "Սեպ",
  "Հոկտ",
  "Նմբ",
  "Դեկտ",
] as const;

/** Fixed TZ so server (often UTC) and client produce identical wall-clock strings for the same instant. */
const DISPLAY_TZ = "Asia/Yerevan";

function parseSvSeDate(value: Date | string) {
  const d = new Date(value);
  const datePart = new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, mo, day] = datePart.split("-").map((x) => Number.parseInt(x, 10));
  return { y, mo, day };
}

function parseSvSeDateTime(value: Date | string) {
  const d = new Date(value);
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  const [datePart, timePart] = formatted.split(" ");
  const [y, mo, day] = datePart.split("-").map((x) => Number.parseInt(x, 10));
  const [hh = "00", mm = "00"] = timePart.split(":");
  return { y, mo, day, hh, mm };
}

export function formatAmd(value: number) {
  return `${new Intl.NumberFormat("hy-AM", {
    maximumFractionDigits: 0,
  }).format(value)} ֏`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("hy-AM").format(value);
}

export function formatDateTime(value: Date | string) {
  const { y, mo, day, hh, mm } = parseSvSeDateTime(value);
  const label = HY_MONTH_SHORT[mo - 1] ?? "";
  return `${String(day).padStart(2, "0")} ${label}, ${y} թ., ${hh}:${mm}`;
}

export function formatDate(value: Date | string) {
  const { y, mo, day } = parseSvSeDate(value);
  const label = HY_MONTH_SHORT[mo - 1] ?? "";
  return `${String(day).padStart(2, "0")} ${label}, ${y} թ.`;
}
