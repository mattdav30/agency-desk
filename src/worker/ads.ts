import { Hono } from "hono";
import type { Env } from "./index";
import { config } from "../config";
import { monthExpected, splitByMonth, type AdRow } from "../shared/ads";
import { todayIn } from "../shared/schedule";

export const ads = new Hono<{ Bindings: Env }>();

const MAX_FILE = 10 * 1024 * 1024;
const MAX_ROWS = 20000;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const whole = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e10 ? Math.round(v) : 0);
const bad = (c: any, message: string) => c.json({ error: message }, 400);

function addMonths(month: string, n: number) {
  const d = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

// ---------- reading ----------

ads.get("/ads", async (c) => {
  const db = c.env.DB;
  const today = todayIn(config.timezone);
  const q = c.req.query("month");
  const month = isMonth(q) ? q : today.slice(0, 7);
  const from = addMonths(month, -5);

  const [clients, spend, budgets, prior, trend, months, imports] = await Promise.all([
    db.prepare("select id, name, currency from clients where active = 1").all<{ id: number; name: string; currency: string }>(),
    db.prepare("select client_id, source, sum(spend) spent, sum(impressions) impressions, sum(clicks) clicks from ad_spend where substr(spend_date, 1, 7) = ? and client_id is not null group by client_id, source").bind(month).all<{ client_id: number; source: string; spent: number; impressions: number; clicks: number }>(),
    db.prepare("select client_id, amount from budgets where month = ?").bind(month).all<{ client_id: number; amount: number }>(),
    db.prepare("select client_id, amount from budgets b where month < ?1 and month = (select max(month) from budgets where client_id = b.client_id and month < ?1)").bind(month).all<{ client_id: number; amount: number }>(),
    db.prepare("select substr(a.spend_date, 1, 7) month, c.currency, sum(a.spend) total from ad_spend a join clients c on c.id = a.client_id where substr(a.spend_date, 1, 7) between ? and ? group by 1, 2").bind(from, month).all<{ month: string; currency: string; total: number }>(),
    db.prepare("select distinct substr(spend_date, 1, 7) month from ad_spend").all<{ month: string }>(),
    db.prepare(`select i.id, i.source, i.filename, i.client_id, c.name client_name, i.currency, i.period_start, i.period_end, i.row_count, i.total_spend, i.skipped, i.created_at,
      (select count(*) from ad_spend where import_id = i.id) live from imports i left join clients c on c.id = i.client_id order by i.id desc limit 40`).all(),
  ]);

  const budgetOf = new Map(budgets.results.map((b) => [b.client_id, b.amount]));
  const priorOf = new Map(prior.results.map((b) => [b.client_id, b.amount]));
  const rows = new Map<number, { spent: number; impressions: number; clicks: number; channels: string[] }>();
  for (const s of spend.results) {
    const r = rows.get(s.client_id) ?? { spent: 0, impressions: 0, clicks: 0, channels: [] };
    r.spent += s.spent; r.impressions += s.impressions; r.clicks += s.clicks; r.channels.push(s.source);
    rows.set(s.client_id, r);
  }
  const list = clients.results
    .filter((cl) => rows.has(cl.id) || budgetOf.has(cl.id))
    .map((cl) => {
      const r = rows.get(cl.id);
      return {
        id: cl.id, name: cl.name, currency: cl.currency,
        spent: Math.round((r?.spent ?? 0) * 100) / 100, impressions: r?.impressions ?? 0, clicks: r?.clicks ?? 0,
        channels: r?.channels ?? [], budget: budgetOf.get(cl.id) ?? null, lastBudget: priorOf.get(cl.id) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const all = new Set([...months.results.map((m) => m.month), today.slice(0, 7), month]);
  return c.json({
    month, today, expected: monthExpected(month, today),
    months: [...all].sort().reverse(),
    clients: list,
    trend: trend.results.map((t) => ({ month: t.month, currency: t.currency, total: Math.round(t.total * 100) / 100 })),
    imports: imports.results,
  });
});

/** Saved column mappings and which client each account belongs to. */
ads.get("/ads/mappings", async (c) => {
  const [maps, clients] = await Promise.all([
    c.env.DB.prepare("select source, mapping from column_mappings").all<{ source: string; mapping: string }>(),
    c.env.DB.prepare("select value from settings where key = 'ad_account_clients'").first<{ value: string }>(),
  ]);
  const mappings: Record<string, unknown> = {};
  for (const m of maps.results) { try { mappings[m.source] = JSON.parse(m.mapping); } catch {} }
  let accountClients: Record<string, number> = {};
  try { accountClients = JSON.parse(clients?.value ?? "{}"); } catch {}
  return c.json({ mappings, accountClients });
});

// ---------- budgets ----------

ads.put("/budgets", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const clientId = Number(b.clientId);
  if (!Number.isInteger(clientId)) return bad(c, "Pick a client.");
  if (!isMonth(b.month)) return bad(c, "Pick a month.");
  const amount = b.amount === null || b.amount === "" ? 0 : Number(b.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return bad(c, "Add a budget between 0 and 1,000,000,000.");
  if (!(await c.env.DB.prepare("select id from clients where id = ?").bind(clientId).first())) return bad(c, "That client is missing.");
  if (amount === 0) await c.env.DB.prepare("delete from budgets where client_id = ? and month = ?").bind(clientId, b.month).run();
  else await c.env.DB.prepare("insert into budgets (client_id, month, amount) values (?, ?, ?) on conflict(client_id, month) do update set amount = excluded.amount").bind(clientId, b.month, Math.round(amount * 100) / 100).run();
  return c.json({ ok: true });
});

// ---------- imports ----------

type Meta = { source?: unknown; clientId?: unknown; currency?: unknown; mapping?: unknown; accountKey?: unknown; rows?: unknown; skipped?: unknown };

function cleanRows(input: unknown): AdRow[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ROWS) return null;
  const out: AdRow[] = [];
  for (const r of input) {
    if (!r || typeof r !== "object") return null;
    const x = r as Record<string, unknown>;
    if (!isDate(x.d) || (x.e !== null && x.e !== undefined && !isDate(x.e))) return null;
    if (typeof x.s !== "number" || !Number.isFinite(x.s) || Math.abs(x.s) > 1e8) return null;
    out.push({ d: x.d, e: (x.e as string | null) ?? null, c: text(x.c, 200), a: text(x.a, 200), s: Math.round(x.s * 100) / 100, i: whole(x.i), k: whole(x.k) });
  }
  return out;
}

ads.post("/imports", async (c) => {
  const db = c.env.DB;
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  let meta: Meta = {};
  try { meta = JSON.parse(String(form?.get("meta") ?? "{}")); } catch {}
  if (!form || !file || typeof file === "string") return bad(c, "Choose a file to upload.");
  if (file.size === 0 || file.size > MAX_FILE) return bad(c, "Files up to 10 MB work. Pick a smaller export.");

  const source = text(meta.source, 40);
  const currency = text(meta.currency, 3).toUpperCase();
  const clientId = Number(meta.clientId);
  const original = cleanRows(meta.rows);
  if (!source) return bad(c, "Name the source, for example Meta.");
  if (!/^[A-Z]{3}$/.test(currency)) return bad(c, "Pick a currency.");
  if (!original) return bad(c, "That file had no readable rows.");
  const client = Number.isInteger(clientId)
    ? await db.prepare("select id, name, currency from clients where id = ?").bind(clientId).first<{ id: number; name: string; currency: string }>()
    : null;
  if (!client) return bad(c, "Pick the client this spend belongs to.");

  if (client.currency !== currency) {
    const has = await db.prepare("select 1 x from ad_spend where client_id = ? limit 1").bind(client.id).first();
    if (has) return bad(c, `${client.name} already has spend in ${client.currency}, and this file is in ${currency}. Pick the right client or change the client currency first.`);
  }

  const rows = original.flatMap(splitByMonth);
  const dates = original.flatMap((r) => [r.d, r.e ?? r.d]).sort();
  const start = dates[0], end = dates[dates.length - 1];
  const total = Math.round(original.reduce((a, r) => a + r.s, 0) * 100) / 100;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "export";
  const key = `imports/${start.slice(0, 7)}/${crypto.randomUUID()}-${safeName}`;

  await c.env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { source } });
  let importId = 0;
  try {
    const res = await db.prepare("insert into imports (source, filename, r2_key, row_count, client_id, currency, period_start, period_end, total_spend, skipped) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(source, file.name.slice(0, 200), key, rows.length, client.id, currency, start, end, total, whole(meta.skipped)).run();
    importId = Number(res.meta.last_row_id);

    const stmts = [
      // A newer file replaces earlier rows from the same source and client in the same dates.
      db.prepare("delete from ad_spend where client_id = ? and source = ? and spend_date between ? and ? and import_id != ?").bind(client.id, source, start, end, importId),
      db.prepare("update clients set currency = ? where id = ?").bind(currency, client.id),
    ];
    const insert = "insert into ad_spend (import_id, client_id, source, channel, campaign, ad_set, spend_date, spend_end, spend, impressions, clicks) select ?1, ?2, ?3, ?3, json_extract(value, '$.c'), json_extract(value, '$.a'), json_extract(value, '$.d'), json_extract(value, '$.e'), json_extract(value, '$.s'), json_extract(value, '$.i'), json_extract(value, '$.k') from json_each(?4)";
    for (let i = 0; i < rows.length; i += 250) stmts.push(db.prepare(insert).bind(importId, client.id, source, JSON.stringify(rows.slice(i, i + 250))));

    // Remember the column mapping and which client this account belongs to.
    const m = meta.mapping as { columns?: Record<string, unknown>; dateFormat?: unknown } | undefined;
    if (m && typeof m.columns === "object" && ["iso", "mdy", "dmy"].includes(String(m.dateFormat))) {
      stmts.push(db.prepare("insert into column_mappings (source, mapping) values (?, ?) on conflict(source) do update set mapping = excluded.mapping").bind(source, JSON.stringify({ columns: m.columns, dateFormat: m.dateFormat, currency })));
    }
    const accountKey = text(meta.accountKey, 120);
    if (accountKey) {
      const cur = await db.prepare("select value from settings where key = 'ad_account_clients'").first<{ value: string }>();
      let map: Record<string, number> = {};
      try { map = JSON.parse(cur?.value ?? "{}"); } catch {}
      map[`${source}|${accountKey}`] = client.id;
      stmts.push(db.prepare("insert into settings (key, value) values ('ad_account_clients', ?) on conflict(key) do update set value = excluded.value").bind(JSON.stringify(map)));
    }
    const results = await db.batch(stmts);
    return c.json({ id: importId, rows: rows.length, replaced: results[0].meta.changes ?? 0, total, currency, start, end, client: client.name }, 201);
  } catch (e) {
    if (importId) await db.prepare("delete from imports where id = ?").bind(importId).run().catch(() => {});
    await c.env.FILES.delete(key).catch(() => {});
    throw e;
  }
});

ads.get("/imports/:id/file", async (c) => {
  const row = await c.env.DB.prepare("select r2_key, filename from imports where id = ?").bind(Number(c.req.param("id"))).first<{ r2_key: string; filename: string }>();
  const obj = row ? await c.env.FILES.get(row.r2_key) : null;
  if (!row || !obj) return c.json({ error: "That file is missing." }, 404);
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream", "Content-Disposition": `attachment; filename="${row.filename.replace(/[^\w.\- ]+/g, "_")}"`, "Cache-Control": "private, no-store" } });
});

ads.delete("/imports/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("select r2_key from imports where id = ?").bind(id).first<{ r2_key: string }>();
  if (!row) return c.json({ error: "That import is missing." }, 404);
  await c.env.DB.prepare("delete from imports where id = ?").bind(id).run(); // spend rows go with it
  await c.env.FILES.delete(row.r2_key).catch(() => {});
  return c.json({ ok: true });
});
