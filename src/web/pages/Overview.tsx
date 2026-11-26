import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { config } from "../../config";
import { Icon } from "../icons";
import { useApp } from "../ctx";
import { Bar, Card, CountUp, Reveal } from "../ui";
import { HeroField } from "../HeroField";
import { MemoryMap } from "../MemoryMap";
import { aiModels, connectors, emails, news as seedNews, newsTopics as seedTopics } from "../seed";
import { PaceCell } from "./AdSpend";
import { TaskForm } from "../forms";
import { TaskList } from "../tasklist";
import { dueLabel, greeting, money, monthName, symbol } from "../util";
import { href } from "../hooks";

const stateLabel = { on: "On", setup: "Needs setup", missing: "Missing" } as const;
const connectorHint: Record<string, string> = {
  OpenRouter: "OpenRouter connects in Phase 4. You will add the key with wrangler secret put.",
  Gmail: "Gmail connects in Phase 6.",
  Outlook: "Outlook connects in Phase 6.",
  Ollama: "Ollama connects in Phase 4. It runs when you are on your own PC.",
  Cloudflare: "Cloudflare is connected. The Worker, D1 and KV are live.",
};

export function Overview() {
  const now = useMemo(() => new Date(), []);
  const { tasks, clients, reports, today, ready, notify, openChat, ads } = useApp();
  const [adding, setAdding] = useState(false);
  const [topics, setTopics] = useState(seedTopics);
  const [topic, setTopic] = useState(seedTopics[0]);
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const open = tasks.filter((t) => !t.done).length;
  const dueToday = reports.filter((r) => r.days === 0 && !r.doneToday).length;
  const todays = tasks.filter((t) => (t.done ? t.dueDate === today : !t.dueDate || t.dueDate <= today));
  const upNext = tasks.filter((t) => !t.done && t.dueDate && t.dueDate > today).slice(0, 4);
  const waiting = emails.filter((e) => e.unread).length;
  const cap = config.monthlySpendCapUsd;

  const submitTopic = (e: FormEvent) => {
    e.preventDefault();
    const t = topicDraft.trim();
    if (t && !topics.includes(t)) { setTopics([...topics, t]); setTopic(t); notify(`${t} added as a chip. Topics are saved and searched daily from Phase 5.`); }
    setTopicDraft(""); setAddingTopic(false);
  };
  const toggleSave = (id: number) => {
    setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    notify(saved.has(id) ? "Removed from saved." : "Marked as saved on this page. Saving to your account arrives in Phase 5.");
  };
  const stories = topic === seedTopics[0] ? seedNews : [];

  return (
    <>
      <section className="hello">
        <HeroField />
        <Reveal><p className="label">{now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></Reveal>
        <Reveal delay={0.1}><h1>{greeting(now)}, {config.owner}.</h1></Reveal>
        <Reveal delay={0.2}>
          <p className="lede">
            <CountUp to={open} /> open tasks, <CountUp to={dueToday} /> {dueToday === 1 ? "report" : "reports"} due today and <CountUp to={waiting} /> waiting emails.
          </p>
        </Reveal>
        <Reveal delay={0.3}><p className="sample">Clients, tasks, reports and ad spend come from your saved data. News and email show sample data until their phases.</p></Reveal>
      </section>

      <div className="grid">
        <Card title="AI models" label="This month" delay={0}>
          <div className="stat-row">
            <div>
              <span className="label">Claude weekly usage</span>
              <div className="big"><CountUp to={aiModels.claudeWeeklyUsage} suffix="%" /></div>
            </div>
            <div>
              <span className="label">API spend</span>
              <div className="big"><CountUp to={aiModels.spendThisMonth} prefix="US$" decimals={2} /> <small>of US${cap}</small></div>
            </div>
          </div>
          <Bar value={aiModels.spendThisMonth / cap} />
          <ul className="chips">{aiModels.active.map((m) => <li key={m}>{m}</li>)}</ul>
        </Card>

        <Card title="Connectors" delay={0.08}>
          <ul className="list">
            {connectors.map((c) => (
              <li key={c.name}>
                <button className="row-btn" onClick={() => notify(connectorHint[c.name])}>
                  <span><strong>{c.name}</strong><span className="muted">{c.note}</span></span>
                  <span className={`status ${c.state}`}><i />{stateLabel[c.state]}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Reports due" label="This week" className="tab-full" delay={0.16} action={<a className="more" href={href("reports")}>All reports</a>}>
          {reports.length ? (
            <ul className="list">
              {reports.slice(0, 5).map((r) => {
                const hot = r.days === 0 && !r.doneToday;
                return (
                  <li key={r.id} className={hot ? "hot" : ""}>
                    <a className="row-btn" href={href("reports")}>
                      <span><strong>{r.name}</strong><span className="muted">{r.client || "No client"}</span></span>
                      <span className="when"><Icon name="clock" size={14} />{r.doneToday && r.days > 0 ? "Done, next " : ""}{dueLabel(now, r.days, r.at)}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : <p className="empty">{ready ? "No reports yet. Add one on the Reports page." : "Loading"}</p>}
        </Card>

        <Card title="Memory map" label={`${clients.length} clients`} className="full" delay={0.05} tilt={false}>
          <MemoryMap />
        </Card>

        <Card title="Today" label={`${open} open`} className="stretch tab-full" delay={0.1}>
          <div className="grow">
            <TaskList tasks={todays} empty={ready ? "Nothing on for today. Add a task to start." : "Loading"} />
            {upNext.length > 0 && (
              <>
                <p className="label subhead">Up next</p>
                <TaskList tasks={upNext} empty="" />
              </>
            )}
          </div>
          {adding ? (
            <TaskForm onDone={() => setAdding(false)} />
          ) : (
            <div><button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={16} />Add task</button></div>
          )}
        </Card>

        <Card title="News radar" label="Weekdays 6:50 am" className="wide" delay={0.05}>
          <div className="topics">
            {topics.map((t) => <button key={t} className={`pill ${topic === t ? "active" : ""}`} onClick={() => setTopic(t)}>{t}</button>)}
            {addingTopic ? (
              <form className="inline-form" onSubmit={submitTopic}>
                <input autoFocus value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} placeholder="Topic name" aria-label="Topic name" />
                <button className="btn small amber">Add</button>
              </form>
            ) : (
              <button className="pill ghost" onClick={() => setAddingTopic(true)}><Icon name="plus" size={14} />Add topic</button>
            )}
            <button className="pill ghost" onClick={() => notify("Run now starts the live news search in Phase 5.")}>Run now</button>
          </div>
          {stories.length ? (
            <div className="stories">
              {stories.map((n, i) => (
                <Reveal key={n.id} as="article" className="story" delay={i * 0.1}>
                  <div className="meta"><span className="tag">{n.tag}</span><span className="label">{n.source} · {n.time}</span></div>
                  <h3>{n.headline}</h3>
                  <p className="flag">{n.stat}</p>
                  <p className="idea"><span className="label">{n.format}</span>{n.idea}</p>
                  <div className="actions">
                    <button className="btn small amber" onClick={() => notify("Draft post arrives in Phase 5. Jarvis will write a bold headline under 10 words and a blurb under 40 words.")}><Icon name="pen" size={14} />Draft post</button>
                    <button className={`btn small ${saved.has(n.id) ? "on" : ""}`} aria-pressed={saved.has(n.id)} onClick={() => toggleSave(n.id)}><Icon name="bookmark" size={14} filled={saved.has(n.id)} />{saved.has(n.id) ? "Saved" : "Save"}</button>
                    <button className="btn small" onClick={() => notify("Read opens the real article once live stories arrive in Phase 5.")}><Icon name="arrow" size={14} />Read</button>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="soon"><span className="label">Coming in Phase 5</span>{topic} gets its first stories when the daily news search goes live.</p>
          )}
        </Card>

        <Card title="Ad spend" label={ads ? monthName(ads.month, true) : "This month"} className="full" delay={0.05} action={<a className="more" href={href("ad-spend")}>Details</a>}>
          {!ads ? <p className="empty">Loading</p> : ads.clients.length === 0 ? (
            <p className="soon"><span className="label">Start here</span>Upload an export on the <a className="cell-link amber" href={href("ad-spend")}>Ad spend page</a> and your spend and pace appear here.</p>
          ) : (
            <>
              <div className="scroll">
                <table>
                  <thead><tr><th>Client</th><th>Channels</th><th className="num">Spent</th><th className="num">Budget</th><th>Pace</th></tr></thead>
                  <tbody>
                    {ads.clients.map((r, i) => (
                      <tr key={r.id}>
                        <td><a className="cell-link" href={href("clients", r.name)}><strong>{r.name}</strong></a></td>
                        <td className="muted">{r.channels.join(", ") || "None"}</td>
                        <td className="num"><CountUp to={r.spent} prefix={symbol(r.currency)} decimals={2} /></td>
                        <td className="num">{r.budget ? money(r.budget, r.currency) : <a className="cell-link amber" href={href("ad-spend")}>Set budget</a>}</td>
                        <td><PaceCell c={r} expected={ads.expected} showMarker delay={i * 0.08} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="pill ghost mt" onClick={() => openChat(`How is ${ads.clients[0].name} pacing?`)}>Ask Jarvis about pace</button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
