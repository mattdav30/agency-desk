import { useMemo, useState, type FormEvent } from "react";
import { config } from "../config";
import { Icon } from "./icons";
import { clients, tasks as seedTasks, reportsDue, connectors, aiModels, adSpend, newsTopics, news } from "./seed";

const navItems = ["Overview", "Clients", "Ad spend", "Reports", "Inbox"];
const money = (n: number) => "$" + n.toLocaleString("en-AU");
const stateLabel = { on: "On", setup: "Needs setup", missing: "Missing" } as const;

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function dueLabel(now: Date, days: number, at: string) {
  if (days === 0) return `Today, ${at}`;
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function Card({ title, label, children, className = "" }: { title: string; label?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <h2>{title}</h2>
        {label && <span className="label">{label}</span>}
      </header>
      {children}
    </section>
  );
}

function JarvisBar({ onAsk }: { onAsk: (model: string, text: string) => void }) {
  const [model, setModel] = useState("auto");
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAsk(model, text.trim());
    setText("");
  };
  return (
    <form className="jarvis" onSubmit={submit}>
      <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
        {config.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Jarvis" aria-label="Ask Jarvis" />
      <button type="submit" className="icon-btn" aria-label="Send"><Icon name="send" /></button>
    </form>
  );
}

function ChatPanel({ messages, onClose }: { messages: { role: string; text: string }[]; onClose: () => void }) {
  return (
    <aside className="chat" role="dialog" aria-label="Jarvis chat">
      <header className="card-head">
        <h2>Jarvis</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close chat"><Icon name="close" /></button>
      </header>
      <div className="chat-body">
        {messages.map((m, i) => <p key={i} className={`msg ${m.role}`}>{m.text}</p>)}
      </div>
    </aside>
  );
}

function MemoryMap() {
  const nodes = [...clients, "Inbox"];
  const cx = 300, cy = 160, rx = 215, ry = 115;
  return (
    <svg className="map" viewBox="-70 0 740 320" role="img" aria-label="Jarvis linked to each client and the inbox">
      {nodes.map((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        const inbox = n === "Inbox";
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        const dx = anchor === "middle" ? 0 : Math.cos(a) > 0 ? 12 : -12;
        const dy = anchor === "middle" ? (Math.sin(a) > 0 ? 24 : -14) : 4;
        return (
          <g key={n}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="map-line" />
            <circle cx={x} cy={y} r={6} className={inbox ? "node amber" : "node blue"} />
            <text x={x + dx} y={y + dy} textAnchor={anchor} className="map-text">{n}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={30} className="hub" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="hub-text">Jarvis</text>
    </svg>
  );
}

export function App() {
  const now = useMemo(() => new Date(), []);
  const [taskList, setTaskList] = useState(seedTasks);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [topic, setTopic] = useState(newsTopics[0]);

  const open = taskList.filter((t) => !t.done).length;
  const dueToday = reportsDue.filter((r) => r.days === 0).length;
  const waiting = 4; // sample until the inbox arrives in Phase 6

  const ask = (model: string, text: string) => {
    const label = config.models.find((m) => m.id === model)?.label ?? model;
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: `${label} is selected. Jarvis answers go live in Phase 4.` }]);
    setChatOpen(true);
  };
  const toggle = (id: number) => setTaskList((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const addTask = () => {
    const title = window.prompt("Task name");
    if (title?.trim()) setTaskList((l) => [...l, { id: Date.now(), title: title.trim(), client: "General", time: "Today", done: false }]);
  };

  const cap = config.monthlySpendCapUsd;
  const spendPct = Math.min(100, (aiModels.spendThisMonth / cap) * 100);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expected = dayOfMonth / daysInMonth;

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><Icon name="logo" size={26} /><span>Agency Desk</span></div>
        <nav className="nav" aria-label="Main">
          {navItems.map((n, i) => <a key={n} href="#" className={i === 0 ? "pill active" : "pill"} onClick={(e) => e.preventDefault()}>{n}</a>)}
        </nav>
        <JarvisBar onAsk={ask} />
      </header>

      <main>
        <section className="hello">
          <p className="label">{now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1>{greeting(now)}, {config.owner}.</h1>
          <p className="lede">{open} open tasks, {dueToday} {dueToday === 1 ? "report" : "reports"} due today and {waiting} waiting emails.</p>
          <p className="sample">Sample data shown. Live data arrives in later phases.</p>
        </section>

        <div className="grid">
          <Card title="AI models" label="This month">
            <div className="stat-row">
              <div>
                <span className="label">Claude weekly usage</span>
                <div className="big">{aiModels.claudeWeeklyUsage}%</div>
              </div>
              <div>
                <span className="label">API spend</span>
                <div className="big">US${aiModels.spendThisMonth.toFixed(2)} <small>of US${cap}</small></div>
              </div>
            </div>
            <div className="bar" aria-label={`${spendPct.toFixed(0)} percent of cap used`}><i style={{ width: `${spendPct}%` }} /></div>
            <ul className="chips">{aiModels.active.map((m) => <li key={m}>{m}</li>)}</ul>
          </Card>

          <Card title="Connectors">
            <ul className="list">
              {connectors.map((c) => (
                <li key={c.name}>
                  <div><strong>{c.name}</strong><span className="muted">{c.note}</span></div>
                  <span className={`status ${c.state}`}><i />{stateLabel[c.state]}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Reports due" label="This week">
            <ul className="list">
              {reportsDue.map((r) => (
                <li key={r.id} className={r.today ? "hot" : ""}>
                  <div><strong>{r.name}</strong><span className="muted">{r.client}</span></div>
                  <span className="when"><Icon name="clock" size={14} />{dueLabel(now, r.days, r.at)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Memory map" label={`${clients.length} clients`} className="wide">
            <div className="scroll"><MemoryMap /></div>
          </Card>

          <Card title="Today" label={`${open} open`}>
            <ul className="list">
              {taskList.map((t) => (
                <li key={t.id}>
                  <label className="task">
                    <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                    <span className="box"><Icon name="check" size={14} /></span>
                    <span className={t.done ? "done" : ""}><strong>{t.title}</strong><span className="muted">{t.client}</span></span>
                  </label>
                  <span className="when">{t.time}</span>
                </li>
              ))}
            </ul>
            <button className="btn" onClick={addTask}><Icon name="plus" size={16} />Add task</button>
          </Card>

          <Card title="News radar" label="Weekdays 6:50 am" className="wide">
            <div className="topics">
              {newsTopics.map((t) => <button key={t} className={`pill ${topic === t ? "active" : ""}`} onClick={() => setTopic(t)}>{t}</button>)}
              <button className="pill ghost"><Icon name="plus" size={14} />Add topic</button>
              <button className="pill ghost">Run now</button>
            </div>
            <div className="stories">
              {news.map((n) => (
                <article key={n.id} className="story">
                  <div className="meta"><span className="tag">{n.tag}</span><span className="label">{n.source} · {n.time}</span></div>
                  <h3>{n.headline}</h3>
                  <p className="flag">{n.stat}</p>
                  <p className="idea"><span className="label">{n.format}</span>{n.idea}</p>
                  <div className="actions">
                    <button className="btn small amber"><Icon name="pen" size={14} />Draft post</button>
                    <button className="btn small"><Icon name="bookmark" size={14} />Save</button>
                    <button className="btn small"><Icon name="arrow" size={14} />Read</button>
                  </div>
                </article>
              ))}
            </div>
          </Card>

          <Card title="Ad spend" label="This month" className="full">
            <div className="scroll">
              <table>
                <thead><tr><th>Client</th><th>Channels</th><th className="num">Spent</th><th className="num">Budget</th><th>Pace</th></tr></thead>
                <tbody>
                  {adSpend.map((r) => {
                    const used = r.spent / r.budget;
                    const status = used > expected + 0.15 ? "Ahead" : used < expected - 0.15 ? "Behind" : "On pace";
                    return (
                      <tr key={r.client}>
                        <td><strong>{r.client}</strong></td>
                        <td className="muted">{r.channels}</td>
                        <td className="num">{money(r.spent)}</td>
                        <td className="num">{money(r.budget)}</td>
                        <td>
                          <div className="pace">
                            <div className="bar"><i style={{ width: `${Math.min(100, used * 100)}%` }} /><b style={{ left: `${expected * 100}%` }} /></div>
                            <span className="label">{status}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      {chatOpen && <ChatPanel messages={messages} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
