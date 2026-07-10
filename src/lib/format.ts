const dateFmt = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

export function formatDateTime(d: Date): string {
  return dateTimeFmt.format(d);
}

/** Affiche une note : 8.5 → "8.50", null → "–" */
export function formatScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return n.toFixed(2);
}
