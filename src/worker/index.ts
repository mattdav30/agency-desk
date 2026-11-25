import { Hono } from "hono";

export type Env = {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  FILES?: R2Bucket; // added in Phase 3
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", async (c) => {
  const checks = { db: false, kv: false };
  try { await c.env.DB.prepare("select 1").first(); checks.db = true; } catch {}
  try { await c.env.KV.get("health"); checks.kv = true; } catch {}
  return c.json({ ok: true, checks });
});

export default app;
