export type Client = { id: number; name: string; channels: string; note: string; currency: string };
export type Task = { id: number; title: string; clientId: number | null; client: string; dueDate: string | null; done: boolean };
export type Frequency = "daily" | "weekly" | "monthly";
export type Report = {
  id: number; name: string; clientId: number | null; client: string; clientLabel: string;
  frequency: Frequency; dueTime: string; dueDay: number | null; schedule: string; at: string;
  nextDue: string; days: number; doneToday: boolean;
};
export type State = { today: string; clients: Client[]; tasks: Task[]; reports: Report[] };

export async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Something went wrong. Try again.");
  return json as T;
}

export type AdClient = { id: number; name: string; currency: string; spent: number; impressions: number; clicks: number; channels: string[]; budget: number | null; lastBudget: number | null };
export type ImportRow = {
  id: number; source: string; filename: string; client_id: number | null; client_name: string | null; currency: string | null;
  period_start: string | null; period_end: string | null; row_count: number; total_spend: number; skipped: number; created_at: string; live: number;
};
export type Ads = {
  month: string; today: string; expected: number; months: string[];
  clients: AdClient[]; trend: { month: string; currency: string; total: number }[]; imports: ImportRow[];
};

export async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Something went wrong. Try again.");
  return json as T;
}
