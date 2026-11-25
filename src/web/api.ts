export type Client = { id: number; name: string; channels: string; note: string };
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
