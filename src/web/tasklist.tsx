import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./icons";
import { useApp, type Task } from "./ctx";
import { TaskForm } from "./forms";

export function dueText(d: string | null, today: string) {
  if (!d) return "No date";
  if (d === today) return "Today";
  const label = new Date(d + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  return d < today ? `Late, ${label}` : label;
}

/** Task rows with a tick, edit and delete. Ticks save straight away. */
export function TaskList({ tasks, showClient = true, empty }: { tasks: Task[]; showClient?: boolean; empty: string }) {
  const { toggleTask, removeTask, today } = useApp();
  const [editing, setEditing] = useState<number | null>(null);
  const [asking, setAsking] = useState<number | null>(null);

  if (!tasks.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="list">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <motion.li key={t.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            {editing === t.id ? (
              <div style={{ flex: 1 }}><TaskForm task={t} onDone={() => setEditing(null)} /></div>
            ) : (
              <>
                <label className="task">
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                  <span className="box"><Icon name="check" size={14} /></span>
                  <span className={t.done ? "done" : ""}><strong>{t.title}</strong>{showClient && <span className="muted">{t.client || "General"}</span>}</span>
                </label>
                <span className={`when ${t.dueDate && t.dueDate < today && !t.done ? "amber" : ""}`}>{dueText(t.dueDate, today)}</span>
                {asking === t.id ? (
                  <span className="row-actions">
                    <button className="btn small danger" onClick={() => { setAsking(null); removeTask(t.id); }}>Delete</button>
                    <button className="btn small" onClick={() => setAsking(null)}>Keep</button>
                  </span>
                ) : (
                  <span className="task-row" style={{ flex: "none" }}>
                    <button className="icon-btn ghost row-icon" aria-label={`Edit ${t.title}`} onClick={() => setEditing(t.id)}><Icon name="pen" size={16} /></button>
                    <button className="icon-btn ghost row-icon" aria-label={`Delete ${t.title}`} onClick={() => setAsking(t.id)}><Icon name="trash" size={16} /></button>
                  </span>
                )}
              </>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
