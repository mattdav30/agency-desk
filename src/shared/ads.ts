// Ad export reading. Pure functions shared by the browser (upload) and tests.
// Every file stays in its own currency. Nothing here converts money.

export type Field = "date" | "dateEnd" | "spend" | "campaign" | "adSet" | "impressions" | "clicks" | "account" | "currency";
export type Columns = Partial<Record<Field, string>>;
export type DateFormat = "iso" | "mdy" | "dmy";
export type Mapping = { columns: Columns; dateFormat: DateFormat; currency: string };

/** One normalised row. `end` is set when a row covers a date range. */
export type AdRow = { d: string; e: string | null; c: string; a: string; s: number; i: number; k: number };

export const FIELD_LABELS: Record<Field, string> = {
  date: "Date", dateEnd: "End date", spend: "Spend", campaign: "Campaign", adSet: "Ad set",
  impressions: "Impressions", clicks: "Clicks", account: "Account", currency: "Currency",
};
export const REQUIRED: Field[] = ["date", "spend"];
export const SOURCES = ["LinkedIn", "Meta", "Google Ads", "StackAdapt"];
export const CURRENCIES = ["AUD", "GBP", "USD", "EUR", "NZD"];

// ---------- reading files ----------

export function decodeText(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder("utf-8").decode(b.subarray(3));
  return new TextDecoder("utf-8").decode(b);
}

/** Splits delimited text into rows. Handles quotes, tabs, commas and semicolons. */
export function parseDelimited(text: string): string[][] {
  const lines = text.split(/\r\n|\n|\r/);
  const sample = lines.filter((l) => l.trim()).slice(0, 40).join("\n");
  const count = (ch: string) => (sample.match(new RegExp(ch === "\t" ? "\t" : "\\" + ch, "g")) ?? []).length;
  const delim = [",", "\t", ";"].map((d) => [d, count(d)] as const).sort((x, y) => y[1] - x[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Turns spreadsheet cells (text, numbers, dates) into plain text. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export type Table = { preamble: string[]; headers: string[]; rows: string[][] };

/** Finds the header row. Exports often start with a title block. */
export function toTable(grid: string[][]): Table {
  const cells = (r: string[]) => r.filter((c) => c.trim() !== "").length;
  const widest = Math.max(0, ...grid.slice(0, 60).map(cells));
  const at = grid.findIndex((r) => cells(r) >= Math.max(2, Math.ceil(widest * 0.6)));
  if (at < 0) return { preamble: [], headers: [], rows: [] };
  const headers = grid[at].map((h) => h.trim());
  const rows = grid.slice(at + 1).filter((r) => cells(r) > 0).map((r) => headers.map((_, i) => (r[i] ?? "").trim()));
  return { preamble: grid.slice(0, at).map((r) => r.join(" ").trim()).filter(Boolean), headers, rows };
}

// ---------- guessing ----------

export function detectSource(t: Table): string {
  const h = t.headers.map((x) => x.toLowerCase());
  const pre = t.preamble.join(" ").toLowerCase();
  if (h.includes("total spent") && (h.includes("clicks to linkedin page") || pre.includes("ad set performance"))) return "LinkedIn";
  if (h.some((x) => x.startsWith("amount spent")) && h.some((x) => x.startsWith("ad set name") || x.startsWith("campaign name"))) return "Meta";
  if (h.includes("impr.") || (h.includes("currency code") && h.includes("cost"))) return "Google Ads";
  if (pre.includes("stackadapt") || h.includes("advertiser name")) return "StackAdapt";
  return "";
}

const GUESS: Record<Field, RegExp[]> = {
  date: [/^start date \(in utc\)$/, /^date$/, /^day$/, /^reporting starts$/, /^date start$/, /^start date$/, /^week$/, /^month$/],
  dateEnd: [/^reporting ends$/, /^date stop$/],
  spend: [/^total spent$/, /^amount spent/, /^spend( \(.*\))?$/, /^cost( \(.*\))?$/, /^total cost$/],
  campaign: [/^campaign( name)?$/],
  adSet: [/^ad set name$/, /^ad group( name)?$/, /^line item( name)?$/, /^ad name$/],
  impressions: [/^impressions$/, /^impr\.$/],
  clicks: [/^clicks$/, /^link clicks$/, /^clicks \(all\)$/],
  account: [/^account( name)?$/, /^advertiser( name)?$/],
  currency: [/^currency( code)?$/],
};

export function guessColumns(headers: string[]): Columns {
  const out: Columns = {};
  for (const f of Object.keys(GUESS) as Field[]) {
    for (const re of GUESS[f]) {
      const hit = headers.find((h) => re.test(h.toLowerCase()));
      if (hit) { out[f] = hit; break; }
    }
  }
  return out;
}

export function detectCurrency(t: Table, cols: Columns): string {
  if (cols.currency) {
    const v = t.rows.map((r) => r[t.headers.indexOf(cols.currency!)]).find((x) => /^[A-Za-z]{3}$/.test(x ?? ""));
    if (v) return v.toUpperCase();
  }
  const m = (cols.spend ?? "").match(/\(([A-Za-z]{3})\)/);
  if (m) return m[1].toUpperCase();
  const money = t.rows.slice(0, 20).map((r) => r[t.headers.indexOf(cols.spend ?? "")] ?? "").join("");
  if (money.includes("£")) return "GBP";
  if (money.includes("€")) return "EUR";
  return "";
}

export function detectDateFormat(values: string[]): DateFormat {
  if (values.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return "iso";
  let first = false, second = false;
  for (const v of values) {
    const m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) first = true;
    if (+m[2] > 12) second = true;
  }
  if (second && !first) return "mdy";
  return "dmy"; // Australian default when both orders fit
}

// ---------- normalising ----------

export function parseNumber(v: string): number {
  let s = v.replace(/[^\d.,\-()]/g, "");
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\-]/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

export function parseDate(v: string, fmt: DateFormat): string | null {
  let y: number, m: number, d: number;
  let x = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else {
    x = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (!x) return null;
    const a = +x[1], b = +x[2];
    y = +x[3] < 100 ? 2000 + +x[3] : +x[3];
    if (fmt === "mdy") { m = a; d = b; } else { d = a; m = b; }
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1) return null;
  return probe.toISOString().slice(0, 10);
}

export type Normalised = { rows: AdRow[]; skipped: number; start: string; end: string; total: number; accounts: string[] };

export function normalise(t: Table, map: Mapping): Normalised {
  const col = (f: Field) => (map.columns[f] ? t.headers.indexOf(map.columns[f]!) : -1);
  const ix = { date: col("date"), end: col("dateEnd"), spend: col("spend"), camp: col("campaign"), set: col("adSet"), imp: col("impressions"), clk: col("clicks"), acc: col("account") };
  const rows: AdRow[] = [];
  const accounts = new Set<string>();
  let skipped = 0;
  if (ix.date < 0 || ix.spend < 0) return { rows, skipped: t.rows.length, start: "", end: "", total: 0, accounts: [] };
  for (const r of t.rows) {
    const d = parseDate(r[ix.date] ?? "", map.dateFormat);
    const s = parseNumber(r[ix.spend] ?? "");
    if (!d || !Number.isFinite(s)) { skipped++; continue; }
    let e = ix.end >= 0 ? parseDate(r[ix.end] ?? "", map.dateFormat) : null;
    if (e && e <= d) e = null;
    const num = (i: number) => (i >= 0 ? Math.max(0, Math.round(parseNumber(r[i] ?? "")) || 0) : 0);
    rows.push({ d, e, c: ix.camp >= 0 ? r[ix.camp] ?? "" : "", a: ix.set >= 0 ? r[ix.set] ?? "" : "", s: Math.round(s * 100) / 100, i: num(ix.imp), k: num(ix.clk) });
    if (ix.acc >= 0 && r[ix.acc]) accounts.add(r[ix.acc]);
  }
  const dates = rows.flatMap((r) => [r.d, r.e ?? r.d]).sort();
  return {
    rows, skipped, start: dates[0] ?? "", end: dates[dates.length - 1] ?? "",
    total: Math.round(rows.reduce((a, r) => a + r.s, 0) * 100) / 100, accounts: [...accounts],
  };
}

// ---------- ranges across months ----------

const DAY = 86400000;
const ms = (d: string) => Date.parse(d + "T00:00:00Z");
const iso = (n: number) => new Date(n).toISOString().slice(0, 10);

/** A report range that crosses a month end is split by days, so each month gets its fair share. */
export function splitByMonth(r: AdRow): AdRow[] {
  if (!r.e || r.d.slice(0, 7) === r.e.slice(0, 7)) return [r];
  const total = Math.round((ms(r.e) - ms(r.d)) / DAY) + 1;
  const parts: { from: string; to: string; days: number }[] = [];
  let from = r.d;
  while (from.slice(0, 7) !== r.e.slice(0, 7)) {
    const y = +from.slice(0, 4), m = +from.slice(5, 7);
    const last = iso(Date.UTC(y, m, 0));
    parts.push({ from, to: last, days: Math.round((ms(last) - ms(from)) / DAY) + 1 });
    from = iso(ms(last) + DAY);
  }
  parts.push({ from, to: r.e, days: Math.round((ms(r.e) - ms(from)) / DAY) + 1 });
  let sLeft = Math.round(r.s * 100), iLeft = r.i, kLeft = r.k;
  return parts.map((p, n) => {
    const last = n === parts.length - 1;
    const share = p.days / total;
    const s = last ? sLeft : Math.round(Math.round(r.s * 100) * share), i = last ? iLeft : Math.round(r.i * share), k = last ? kLeft : Math.round(r.k * share);
    sLeft -= s; iLeft -= i; kLeft -= k;
    return { ...r, d: p.from, e: p.to, s: s / 100, i, k };
  });
}

// ---------- matching a client ----------

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "ads", "ltd", "pty", "page", "management"].includes(w));

/** Best client for an account or file name, or null when nothing fits. */
export function matchClient(label: string, clients: { id: number; name: string }[]): number | null {
  const want = new Set(tokens(label));
  let best: { id: number; score: number } | null = null;
  for (const c of clients) {
    const score = tokens(c.name).filter((w) => want.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best?.id ?? null;
}

// ---------- pace ----------

/** Share of the month that has passed. Past months read 1, later months 0. */
export function monthExpected(month: string, today: string): number {
  const cur = today.slice(0, 7);
  if (month < cur) return 1;
  if (month > cur) return 0;
  const days = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  return +today.slice(8, 10) / days;
}

export function paceWord(spent: number, budget: number, expected: number): string {
  const used = spent / budget;
  if (used > 1) return "Over budget";
  return used > expected + 0.15 ? "Ahead" : used < expected - 0.15 ? "Behind" : "On pace";
}
