export const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const compactIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

export function formatDateShort(date: Date): string {
  return `${date.getDate()} ${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date).toUpperCase()}`;
}

export function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat("id-ID").format(date);
}
