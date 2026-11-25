import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { tasks as seedTasks } from "./seed";

export type Task = { id: number; title: string; client: string; time: string; done: boolean };

type Ctx = {
  tasks: Task[];
  toggleTask: (id: number) => void;
  addTask: (title: string, client?: string) => void;
  removeTask: (id: number) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState("");
  const [model, setModel] = useState("auto");

  const notify = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value: Ctx = {
    tasks, notify, chatOpen, chatPrefill, model, setModel,
    toggleTask: (id) => setTasks((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
    addTask: (title, client = "General") => setTasks((l) => [...l, { id: Date.now(), title, client, time: "Today", done: false }]),
    removeTask: (id) => setTasks((l) => l.filter((t) => t.id !== id)),
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
