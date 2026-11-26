// Report schedule maths. Dates are plain YYYY-MM-DD strings in the app timezone.

export type Frequency = "daily" | "weekly" | "monthly";
export type Schedule = { frequency: Frequency; dueDay: number | null };

const DAY = 86400000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((toMs(a) - toMs(b)) / DAY);

export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function monthOccurrence(year: number, month: number, dueDay: number): string {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = dueDay === 0 ? last : Math.min(dueDay, last);
  return fromMs(Date.UTC(year, month, day));
}

/** First occurrence on or after `from`. */
export function occurrenceOnOrAfter(s: Schedule, from: string): string {
  if (s.frequency === "daily") return from;
  if (s.frequency === "weekly") {
    const dow = new Date(toMs(from)).getUTCDay();
    return addDays(from, (((s.dueDay ?? 1) - dow) % 7 + 7) % 7);
  }
  const d = new Date(toMs(from));
  const here = monthOccurrence(d.getUTCFullYear(), d.getUTCMonth(), s.dueDay ?? 0);
  return here >= from ? here : monthOccurrence(d.getUTCFullYear(), d.getUTCMonth() + 1, s.dueDay ?? 0);
}

/** The occurrence before `occ`. */
export function occurrenceBefore(s: Schedule, occ: string): string {
  if (s.frequency === "daily") return addDays(occ, -1);
  if (s.frequency === "weekly") return addDays(occ, -7);
  const d = new Date(toMs(occ));
  return monthOccurrence(d.getUTCFullYear(), d.getUTCMonth() - 1, s.dueDay ?? 0);
}

/**
 * Next due date. A run (done mark) counts for an occurrence when its date falls after
 * the previous occurrence, so marking done early completes the coming one.
 */
export function nextDue(s: Schedule, today: string, runDates: string[]): string {
  let occ = occurrenceOnOrAfter(s, today);
  for (let i = 0; i < 4; i++) {
    const prev = occurrenceBefore(s, occ);
    if (!runDates.some((r) => r > prev && r <= today)) return occ;
    occ = occurrenceOnOrAfter(s, addDays(occ, 1));
  }
  return occ;
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4]}`;

export function describeSchedule(s: Schedule, dueTime: string | null): string {
  const at = dueTime ? ` at ${timeLabel(dueTime)}` : "";
  if (s.frequency === "daily") return `Daily${at}`;
  if (s.frequency === "weekly") return `Weekly on ${DOW[s.dueDay ?? 1]}${at}`;
  return s.dueDay === 0 || s.dueDay === null ? `Monthly, last day${at}` : `Monthly on the ${ordinal(s.dueDay)}${at}`;
}

export function timeLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
