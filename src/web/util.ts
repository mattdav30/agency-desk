export const money = (n: number) => "$" + n.toLocaleString("en-AU");

export function monthProgress(now: Date) {
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() / days;
}

export function paceStatus(used: number, expected: number) {
  return used > expected + 0.15 ? "Ahead" : used < expected - 0.15 ? "Behind" : "On pace";
}

export function dueLabel(now: Date, days: number, at: string) {
  if (days === 0) return `Today, ${at}`;
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

export function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
