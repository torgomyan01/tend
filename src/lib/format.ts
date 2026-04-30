export function formatAmd(value: number) {
  return `${new Intl.NumberFormat("hy-AM", {
    maximumFractionDigits: 0,
  }).format(value)} ֏`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("hy-AM").format(value);
}

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("hy-AM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("hy-AM", {
    dateStyle: "medium",
  });
}
