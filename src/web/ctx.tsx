import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type Client, type Report, type State, type Task } from "./api";

export type { Client, Report, Task } from "./api";
export type ClientInput = { name: string; channels: string; note: string };
export type TaskInput = { title: string; clientId: number | null; dueDate?: string | null };
export type ReportInput = { name: string; clientId: number | null; clientLabel: string; frequency: Report["frequency"]; dueTime: string; dueDay: number | null };

type Ctx = {
  ready: boolean;
  today: string;
  clients: Client[];
  tasks: Task[];
  reports: Report[];
  toggleTask: (id: number) => Promise<void>;
  addTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: number, input: TaskInput) => Promise<boolean>;
  removeTask: (id: number) => Promise<void>;
  addClient: (input: ClientInput) => Promise<Client | null>;
  updateClient: (id: number, input: ClientInput) => Promise<boolean>;
  removeClient: (id: number) => Promise<boolean>;
  addReport: (input: ReportInput) => Promise<boolean>;
  updateReport: (id: number, input: ReportInput) => Promise<boolean>;
  removeReport: (id: number) => Promise<void>;
  setReportDone: (id: number, done: boolean) => Promise<void>;
  notify: (message: string) => void;
  openChat: (prefill?: string) => void;
  chatOpen: boolean;
  closeChat: () => void;
  chatPrefill: string;
  model: string;
  setModel: (m: string) => void;
};

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const byDue = (a: Report, b: Report) => a.nextDue.localeCompare(b.nextDue) || a.at.localeCompare(b.at);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<State>({ today: "", clients: [], tasks: [], reports: [] });
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState("");
  const [model, setModel] = useState("auto");

  const notify = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const load = useCallback(async () => {
    try { setData(await api<State>("/state")); }
    catch { notify("Your data is taking a moment to load. Refresh to try again."); }
    finally { setReady(true); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<State>) => setData((d) => ({ ...d, ...patch }));

  // Run a save. On a problem, show the message and return the fallback.
  async function attempt<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn(); } catch (e) { notify((e as Error).message); return fallback; }
  }

  const value: Ctx = {
    ready, today: data.today, clients: data.clients, tasks: data.tasks, reports: data.reports,
    notify, chatOpen, chatPrefill, model, setModel,

    toggleTask: async (id) => {
      const cur = data.tasks.find((t) => t.id === id);
      if (!cur) return;
      const next = !cur.done;
      set({ tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: next } : t)) });
      try { await api(`/tasks/${id}`, "PATCH", { done: next }); }
      catch { set({ tasks: data.tasks }); notify("That tick needs another try."); }
    },
    addTask: (input) => attempt(async () => {
      const t = await api<Task>("/tasks", "POST", input);
      setData((d) => ({ ...d, tasks: [...d.tasks, t] }));
      return true;
    }, false),
    updateTask: (id, input) => attempt(async () => {
      const t = await api<Task>(`/tasks/${id}`, "PATCH", input);
      setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? t : x)) }));
      return true;
    }, false),
    removeTask: async (id) => {
      const before = data.tasks;
      set({ tasks: before.filter((t) => t.id !== id) });
      try { await api(`/tasks/${id}`, "DELETE"); }
      catch { set({ tasks: before }); notify("That task is still here. Try deleting again."); }
    },

    addClient: (input) => attempt(async () => {
      const c = await api<Client>("/clients", "POST", input);
      setData((d) => ({ ...d, clients: [...d.clients, c] }));
      return c;
    }, null),
    updateClient: (id, input) => attempt(async () => {
      const c = await api<Client>(`/clients/${id}`, "PATCH", input);
      setData((d) => ({
        ...d,
        clients: d.clients.map((x) => (x.id === id ? c : x)),
        tasks: d.tasks.map((t) => (t.clientId === id ? { ...t, client: c.name } : t)),
        reports: d.reports.map((r) => (r.clientId === id ? { ...r, client: c.name } : r)),
      }));
      return true;
    }, false),
    removeClient: (id) => attempt(async () => {
      await api(`/clients/${id}`, "DELETE");
      await load();
      return true;
    }, false),

    addReport: (input) => attempt(async () => {
      const r = await api<Report>("/reports", "POST", input);
      setData((d) => ({ ...d, reports: [...d.reports, r].sort(byDue) }));
      return true;
    }, false),
    updateReport: (id, input) => attempt(async () => {
      const r = await api<Report>(`/reports/${id}`, "PATCH", input);
      setData((d) => ({ ...d, reports: d.reports.map((x) => (x.id === id ? r : x)).sort(byDue) }));
      return true;
    }, false),
    removeReport: async (id) => {
      const before = data.reports;
      set({ reports: before.filter((r) => r.id !== id) });
      try { await api(`/reports/${id}`, "DELETE"); }
      catch { set({ reports: before }); notify("That report is still here. Try deleting again."); }
    },
    setReportDone: async (id, done) => {
      try {
        const r = await api<Report>(`/reports/${id}/done`, "POST", { done });
        setData((d) => ({ ...d, reports: d.reports.map((x) => (x.id === id ? r : x)).sort(byDue) }));
      } catch { notify("That mark needs another try."); }
    },

    openChat: (prefill = "") => { setChatPrefill(prefill); setChatOpen(true); },
    closeChat: () => setChatOpen(false),
  };

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
