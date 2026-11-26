import { Hono } from "hono";
import { config } from "../config";
import { ads } from "./ads";
import { CURRENCIES } from "../shared/ads";
import { describeSchedule, diffDays, nextDue, todayIn, timeLabel, type Frequency } from "../shared/schedule";

export type Env = {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  FILES: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", async (c) => {
  const checks = { db: false, kv: false };
  try { await c.env.DB.prepare("select 1").first(); checks.db = true; } catch {}
  try { await c.env.KV.get("health"); checks.kv = true; } catch {}
  return c.json({ ok: true, checks });
});

// ---------- helpers ----------

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const intOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isInteger(Number(v)) ? Number(v) : null);
const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const bad = (c: any, message: string) => c.json({ error: message }, 400);

async function body(c: any): Promise<Record<string, unknown>> {
  try { const b = await c.req.json(); return b && typeof b === "object" ? b : {}; } catch { return {}; }
}

type ClientRow = { id: number; name: string; channels: string; note: string; currency: string; active: number };
const currencyOr = (v: unknown, fallback: string) => (typeof v === "string" && CURRENCIES.includes(v.toUpperCase()) ? v.toUpperCase() : fallback);
type TaskRow = { id: number; client_id: number | null; title: string; due_date: string | null; done: number };
type ReportRow = { id: number; client_id: number | null; client_label: string | null; name: string; frequency: Frequency; due_time: string | null; due_day: number | null };

async function loadReport(db: D1Database, id: number, today: string) {
  const r = await db.prepare("select r.*, c.name as client_name from reports r left join clients c on c.id = r.client_id where r.id = ?").bind(id).first<ReportRow & { client_name: string | null }>();
  if (!r) return null;
  const runs = await db.prepare("select run_date from report_runs where report_id = ? order by run_date desc limit 62").bind(id).all<{ run_date: string }>();
  return shapeReport(r, runs.results.map((x) => x.run_date), today);
}

function shapeReport(r: ReportRow & { client_name: string | null }, runDates: string[], today: string) {
  const s = { frequency: r.frequency, dueDay: r.due_day };
  const due = nextDue(s, today, runDates);
  return {
    id: r.id,
    name: r.name,
    clientId: r.client_id,
    client: r.client_name ?? r.client_label ?? "",
    clientLabel: r.client_label ?? "",
    frequency: r.frequency,
    dueTime: r.due_time ?? "",
    dueDay: r.due_day,
    schedule: describeSchedule(s, r.due_time),
    at: r.due_time ? timeLabel(r.due_time) : "",
    nextDue: due,
    days: diffDays(due, today),
    doneToday: runDates.includes(today),
  };
}

function shapeTask(t: TaskRow & { client_name: string | null }) {
  return { id: t.id, title: t.title, clientId: t.client_id, client: t.client_name ?? "", dueDate: t.due_date, done: !!t.done };
}

const taskSql = "select t.*, c.name as client_name from tasks t left join clients c on c.id = t.client_id";

// ---------- state ----------

app.get("/api/state", async (c) => {
  const today = todayIn(config.timezone);
  const [clients, tasks, reports, runs] = await Promise.all([
    c.env.DB.prepare("select * from clients where active = 1 order by id").all<ClientRow>(),
    c.env.DB.prepare(`${taskSql} order by t.done, t.due_date is null, t.due_date, t.id`).all<TaskRow & { client_name: string | null }>(),
    c.env.DB.prepare("select r.*, c.name as client_name from reports r left join clients c on c.id = r.client_id order by r.id").all<ReportRow & { client_name: string | null }>(),
    c.env.DB.prepare("select report_id, run_date from report_runs where run_date >= date(?, '-70 days')").bind(today).all<{ report_id: number; run_date: string }>(),
  ]);
  const byReport = new Map<number, string[]>();
  for (const r of runs.results) byReport.set(r.report_id, [...(byReport.get(r.report_id) ?? []), r.run_date]);
  const reportList = reports.results
    .map((r) => shapeReport(r, byReport.get(r.id) ?? [], today))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue) || a.at.localeCompare(b.at));
  return c.json({
    today,
    clients: clients.results.map((x) => ({ id: x.id, name: x.name, channels: x.channels, note: x.note, currency: x.currency })),
    tasks: tasks.results.map(shapeTask),
    reports: reportList,
  });
});

// ---------- clients ----------

app.post("/api/clients", async (c) => {
  const b = await body(c);
  const name = str(b.name, 80);
  if (!name) return bad(c, "Add a client name.");
  const dupe = await c.env.DB.prepare("select id from clients where lower(name) = lower(?) and active = 1").bind(name).first();
  if (dupe) return bad(c, "A client with that name exists already.");
  const currency = currencyOr(b.currency, "AUD");
  const res = await c.env.DB.prepare("insert into clients (name, channels, note, currency) values (?, ?, ?, ?)").bind(name, str(b.channels, 200), str(b.note, 500), currency).run();
  return c.json({ id: res.meta.last_row_id, name, channels: str(b.channels, 200), note: str(b.note, 500), currency }, 201);
});

app.patch("/api/clients/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const b = await body(c);
  const name = str(b.name, 80);
  if (!name) return bad(c, "Add a client name.");
  const dupe = await c.env.DB.prepare("select id from clients where lower(name) = lower(?) and active = 1 and id != ?").bind(name, id).first();
  if (dupe) return bad(c, "A client with that name exists already.");
  const cur = await c.env.DB.prepare("select currency from clients where id = ?").bind(id).first<{ currency: string }>();
  if (!cur) return c.json({ error: "Client missing." }, 404);
  const currency = currencyOr(b.currency, cur.currency);
  if (currency !== cur.currency && (await c.env.DB.prepare("select 1 x from ad_spend where client_id = ? limit 1").bind(id).first()))
    return bad(c, `This client has spend saved in ${cur.currency}. Delete those imports on the Ad spend page before changing the currency.`);
  await c.env.DB.prepare("update clients set name = ?, channels = ?, note = ?, currency = ? where id = ?").bind(name, str(b.channels, 200), str(b.note, 500), currency, id).run();
  return c.json({ id, name, channels: str(b.channels, 200), note: str(b.note, 500), currency });
});

app.delete("/api/clients/:id", async (c) => {
  // Tasks and reports stay in place and lose their client link (on delete set null). Its ad spend rows and budgets go with it.
  // Reports keep the client name as a label so they stay recognisable.
  const id = Number(c.req.param("id"));
  const client = await c.env.DB.prepare("select name from clients where id = ?").bind(id).first<{ name: string }>();
  if (!client) return c.json({ error: "Client missing." }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("update reports set client_label = ? where client_id = ?").bind(client.name, id),
    c.env.DB.prepare("delete from ad_spend where client_id = ?").bind(id),
    c.env.DB.prepare("delete from clients where id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});

// ---------- tasks ----------

async function clientExists(db: D1Database, id: number | null) {
  return id === null || !!(await db.prepare("select id from clients where id = ?").bind(id).first());
}

app.post("/api/tasks", async (c) => {
  const b = await body(c);
  const title = str(b.title, 200);
  if (!title) return bad(c, "Add a task name.");
  const clientId = intOrNull(b.clientId);
  if (!(await clientExists(c.env.DB, clientId))) return bad(c, "That client is missing.");
  const due = dateOrNull(b.dueDate) ?? todayIn(config.timezone);
  const res = await c.env.DB.prepare("insert into tasks (client_id, title, due_date) values (?, ?, ?)").bind(clientId, title, due).run();
  const row = await c.env.DB.prepare(`${taskSql} where t.id = ?`).bind(res.meta.last_row_id).first<TaskRow & { client_name: string | null }>();
  return c.json(shapeTask(row!), 201);
});

app.patch("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const b = await body(c);
  const cur = await c.env.DB.prepare("select * from tasks where id = ?").bind(id).first<TaskRow>();
  if (!cur) return c.json({ error: "Task missing." }, 404);
  const title = b.title === undefined ? cur.title : str(b.title, 200);
  if (!title) return bad(c, "Add a task name.");
  const clientId = b.clientId === undefined ? cur.client_id : intOrNull(b.clientId);
  if (!(await clientExists(c.env.DB, clientId))) return bad(c, "That client is missing.");
  const due = b.dueDate === undefined ? cur.due_date : dateOrNull(b.dueDate);
  const done = b.done === undefined ? cur.done : b.done ? 1 : 0;
  await c.env.DB.prepare("update tasks set title = ?, client_id = ?, due_date = ?, done = ? where id = ?").bind(title, clientId, due, done, id).run();
  const row = await c.env.DB.prepare(`${taskSql} where t.id = ?`).bind(id).first<TaskRow & { client_name: string | null }>();
  return c.json(shapeTask(row!));
});

app.delete("/api/tasks/:id", async (c) => {
  await c.env.DB.prepare("delete from tasks where id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---------- reports ----------

function readReport(b: Record<string, unknown>) {
  const name = str(b.name, 120);
  const frequency = b.frequency as Frequency;
  if (!name) return { error: "Add a report name." };
  if (!["daily", "weekly", "monthly"].includes(frequency)) return { error: "Pick daily, weekly or monthly." };
  const dueTime = typeof b.dueTime === "string" && /^\d{2}:\d{2}$/.test(b.dueTime) ? b.dueTime : null;
  let dueDay: number | null = null;
  if (frequency === "weekly") {
    dueDay = intOrNull(b.dueDay) ?? 1;
    if (dueDay < 0 || dueDay > 6) return { error: "Pick a day of the week." };
  } else if (frequency === "monthly") {
    dueDay = intOrNull(b.dueDay) ?? 0;
    if (dueDay < 0 || dueDay > 31) return { error: "Pick a day of the month, or the last day." };
  }
  return { value: { name, frequency, dueTime, dueDay, clientId: intOrNull(b.clientId), clientLabel: str(b.clientLabel, 80) } };
}

app.post("/api/reports", async (c) => {
  const r = readReport(await body(c));
  if (!r.value) return bad(c, r.error!);
  const v = r.value;
  if (!(await clientExists(c.env.DB, v.clientId))) return bad(c, "That client is missing.");
  const res = await c.env.DB.prepare("insert into reports (client_id, client_label, name, frequency, due_time, due_day) values (?, ?, ?, ?, ?, ?)")
    .bind(v.clientId, v.clientId ? null : v.clientLabel || null, v.name, v.frequency, v.dueTime, v.dueDay).run();
  return c.json(await loadReport(c.env.DB, Number(res.meta.last_row_id), todayIn(config.timezone)), 201);
});

app.patch("/api/reports/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const r = readReport(await body(c));
  if (!r.value) return bad(c, r.error!);
  const v = r.value;
  if (!(await clientExists(c.env.DB, v.clientId))) return bad(c, "That client is missing.");
  const res = await c.env.DB.prepare("update reports set client_id = ?, client_label = ?, name = ?, frequency = ?, due_time = ?, due_day = ? where id = ?")
    .bind(v.clientId, v.clientId ? null : v.clientLabel || null, v.name, v.frequency, v.dueTime, v.dueDay, id).run();
  if (!res.meta.changes) return c.json({ error: "Report missing." }, 404);
  return c.json(await loadReport(c.env.DB, id, todayIn(config.timezone)));
});

app.delete("/api/reports/:id", async (c) => {
  await c.env.DB.prepare("delete from reports where id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

app.post("/api/reports/:id/done", async (c) => {
  const id = Number(c.req.param("id"));
  const b = await body(c);
  const today = todayIn(config.timezone);
  const exists = await c.env.DB.prepare("select id from reports where id = ?").bind(id).first();
  if (!exists) return c.json({ error: "Report missing." }, 404);
  if (b.done === false) await c.env.DB.prepare("delete from report_runs where report_id = ? and run_date = ?").bind(id, today).run();
  else await c.env.DB.prepare("insert or ignore into report_runs (report_id, run_date) values (?, ?)").bind(id, today).run();
  return c.json(await loadReport(c.env.DB, id, today));
});

app.route("/api", ads);

app.onError((e, c) => {
  console.error(e.message);
  return c.json({ error: "Something went wrong. Try again." }, 500);
});

export default app;
