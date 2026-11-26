const SYMBOLS: Record<string, string> = { AUD: "$", GBP: "£", USD: "US$", EUR: "€", NZD: "NZ$" };
export const symbol = (currency: string) => SYMBOLS[currency] ?? currency + " ";

/** Money in the client's own currency. Amounts are never converted. */
export function money(n: number, currency = "AUD", decimals = 0) {
  const body = Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n < 0 ? "-" : ""}${symbol(currency)}${body}`;
}
export const niceDate = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const monthName = (m: string, long = false) => new Date(m + "-01T00:00:00Z").toLocaleDateString("en-AU", { month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" });

export function monthProgress(now: Date) {
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() / days;
}

export function paceStatus(used: number, expected: number) {
  return used > expected + 0.15 ? "Ahead" : used < expected - 0.15 ? "Behind" : "On pace";
}

export function dueLabel(now: Date, days: number, at: string) {
  if (days === 0) return at ? `Today, ${at}` : "Today";
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

export function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
