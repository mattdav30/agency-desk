import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { config } from "../config";
import { Icon } from "./icons";
import { useApp } from "./ctx";
import { adSpend } from "./seed";
import type { Report, Task } from "./api";

const modelNotes: Record<string, string> = {
  auto: "Auto will pick the best model for each task. Rules live in src/config.ts and go live in Phase 4.",
  claude: "Claude is selected. Live answers arrive in Phase 4.",
  gpt6: "GPT 6 is selected. Its model id is a placeholder in src/config.ts until Phase 4.",
  ollama: "Ollama runs when you are on your own PC. It connects in Phase 4.",
};

export function JarvisBar() {
  const { model, setModel, notify, openChat } = useApp();
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    openChat(text.trim());
    setText("");
  };
  return (
    <form className="jarvis" onSubmit={submit}>
      <select value={model} onChange={(e) => { setModel(e.target.value); notify(modelNotes[e.target.value]); }} aria-label="Model">
        {config.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Jarvis" aria-label="Ask Jarvis" />
      <button type="submit" className="icon-btn" aria-label="Open chat"><Icon name="send" /></button>
    </form>
  );
}

type Msg = { role: "user" | "assistant"; text: string };

function answer(q: string, open: Task[], reports: Report[], today: string, model: string): string {
  const s = q.toLowerCase();
  if (s.includes("due") || s.includes("today")) {
    const t = open.filter((x) => !x.dueDate || x.dueDate <= today).map((x) => x.title).join(", ") || "No open tasks";
    const r = reports.filter((x) => x.days === 0 && !x.doneToday).map((x) => `${x.name} for ${x.client || "no client"}${x.at ? " at " + x.at : ""}`).join(", ") || "no reports";
    return `Tasks: ${t}. Reports due today: ${r}.`;
  }
  const hit = adSpend.find((c) => s.includes(c.client.toLowerCase().split(" ")[0]));
  if (s.includes("pac") || s.includes("spend") || hit) {
    const c = hit ?? adSpend[0];
    return `From sample ad spend data. ${c.client} has spent $${c.spent.toLocaleString("en-AU")} of $${c.budget.toLocaleString("en-AU")} this month.`;
  }
  const label = config.models.find((m) => m.id === model)?.label ?? model;
  return `${label} is selected. Open ended answers go live in Phase 4. Try asking what is due today or how Woodside is pacing.`;
}

export function ChatPanel() {
  const { chatOpen, closeChat, chatPrefill, tasks, reports, today, model } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "Hi Matt. I am Jarvis. Full conversations arrive in Phase 4. Until then I answer a few questions from your tasks and reports." }]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const send = (q: string) => {
    if (!q.trim()) return;
    const open = tasks.filter((t) => !t.done);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "assistant", text: answer(q, open, reports, today, model) }]);
  };

  useEffect(() => {
    if (!chatOpen) return;
    if (chatPrefill) send(chatPrefill);
    input.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatPrefill]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && chatOpen && closeChat();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [chatOpen, closeChat]);

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.aside className="chat" role="dialog" aria-label="Jarvis chat" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
          <header className="card-head">
            <h2>Jarvis</h2>
            <button className="icon-btn ghost" onClick={closeChat} aria-label="Close chat"><Icon name="close" /></button>
          </header>
          <div className="chat-body">
            {msgs.map((m, i) => <motion.p key={i} className={`msg ${m.role}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{m.text}</motion.p>)}
            <div ref={end} />
          </div>
          <div className="suggest">
            {["What is due today?", "How is Woodside pacing?"].map((q) => <button key={q} className="pill ghost small" onClick={() => send(q)}>{q}</button>)}
          </div>
          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(text); setText(""); }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Jarvis" aria-label="Message" />
            <button className="icon-btn" aria-label="Send"><Icon name="send" /></button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
