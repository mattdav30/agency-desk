import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../icons";
import { useApp } from "../ctx";
import { Bar, Card, CountUp, PageHead, Reveal, Soon } from "../ui";
import { adSpend, emails, monthlySpend } from "../seed";
import { ConfirmDelete, ReportForm } from "../forms";
import { dueLabel, money, monthProgress, paceStatus } from "../util";
import { href } from "../hooks";

export function AdSpendPage() {
  const { notify } = useApp();
  const now = useMemo(() => new Date(), []);
  const expected = monthProgress(now);
  const total = adSpend.reduce((a, r) => a + r.spent, 0);
  const budget = adSpend.reduce((a, r) => a + r.budget, 0);
  const max = Math.max(...monthlySpend.map((m) => m.value));
  return (
    <>
      <PageHead label="Ad spend" title="Spend and pace" lede="Sample figures for now. Real numbers come from your CSV exports." action={
        <button className="btn amber" onClick={() => notify("CSV upload arrives in Phase 3. You will map columns once per source.")}><Icon name="upload" size={16} />Upload CSV</button>
      } />
      <div className="grid two">
        <Card title="This month" delay={0}>
          <div className="big"><CountUp to={total} prefix="$" /> <small>of {money(budget)}</small></div>
          <Bar value={total / budget} marker={expected} />
          <p className="label mt">{paceStatus(total / budget, expected)} across all clients</p>
        </Card>
        <Card title="Last six months" label="Sample" delay={0.08}>
          <div className="columns" role="img" aria-label="Monthly spend, sample figures">
            {monthlySpend.map((m, i) => (
              <div key={m.month} className="col">
                <motion.i initial={{ height: 0 }} whileInView={{ height: `${(m.value / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }} />
                <span className="label">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="By client" className="wide" delay={0.05}>
          <div className="scroll">
            <table>
              <thead><tr><th>Client</th><th>Channels</th><th className="num">Spent</th><th className="num">Budget</th><th>Pace</th></tr></thead>
              <tbody>
                {adSpend.map((r, i) => (
                  <tr key={r.client}>
                    <td><a className="cell-link" href={href("clients", r.client)}><strong>{r.client}</strong></a></td>
                    <td className="muted">{r.channels}</td>
                    <td className="num">{money(r.spent)}</td>
                    <td className="num">{money(r.budget)}</td>
                    <td><div className="pace"><Bar value={r.spent / r.budget} marker={expected} delay={i * 0.06} /><span className="label">{paceStatus(r.spent / r.budget, expected)}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Budgets and imports" className="wide" delay={0.1}>
          <Soon phase={3}>Set a budget per client per month and keep every uploaded file.</Soon>
        </Card>
      </div>
    </>
  );
}

export function ReportsPage() {
  const { reports, ready, setReportDone, removeReport, notify } = useApp();
  const now = useMemo(() => new Date(), []);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <PageHead label="Reports" title="Reports due" lede="Daily, weekly and monthly reports, with the next due date for each." action={
        <button className="btn amber" onClick={() => setAdding(!adding)}><Icon name={adding ? "close" : "plus"} size={16} />{adding ? "Close" : "Add report"}</button>
      } />
      {adding && <div className="panel-form"><Card title="New report" tilt={false}><ReportForm onDone={() => setAdding(false)} /></Card></div>}
      {ready && !reports.length && <p className="empty">No reports yet. Add the first one above.</p>}
      <div className="grid two">
        {reports.map((r, i) => {
          const hot = r.days === 0 && !r.doneToday;
          return (
            <Card key={r.id} delay={i * 0.08}>
              {editing === r.id ? (
                <ReportForm report={r} onDone={() => setEditing(null)} />
              ) : (
                <>
                  <p className="label">{r.schedule}</p>
                  <h3 className="card-title">{r.name}</h3>
                  {r.clientId ? <a className="cell-link" href={href("clients", r.client)}>{r.client}</a> : <span className="muted">{r.client || "No client"}</span>}
                  <p className={`when mt ${hot ? "amber" : ""}`}><Icon name="clock" size={14} />{r.doneToday ? "Done today. Next " : ""}{dueLabel(now, r.days, r.at)}</p>
                  <div className="row-actions">
                    <button className={`btn small ${r.doneToday ? "on" : ""}`} aria-pressed={r.doneToday} onClick={() => { setReportDone(r.id, !r.doneToday); }}><Icon name="check" size={14} />{r.doneToday ? "Done for today" : "Mark done"}</button>
                    <button className="btn small" onClick={() => setEditing(r.id)}><Icon name="pen" size={14} />Edit</button>
                    <ConfirmDelete onConfirm={() => { removeReport(r.id); notify(`${r.name} deleted.`); }} />
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function InboxPage() {
  const { notify } = useApp();
  return (
    <>
      <PageHead label="Inbox" title="Waiting emails" lede="Unread client emails from Gmail and Outlook, linked to each client." action={
        <button className="btn amber" onClick={() => notify("Gmail and Outlook connect in Phase 6. We will plan the sign in together first.")}><Icon name="mail" size={16} />Connect an inbox</button>
      } />
      <Reveal><Soon phase={6}>These emails are sample data.</Soon></Reveal>
      <Card tilt={false} delay={0.1}>
        <ul className="list">
          {emails.map((m) => (
            <li key={m.id}>
              <button className="row-btn" onClick={() => notify("Reading and replying to email arrives in Phase 6.")}>
                <span><strong className={m.unread ? "unread" : ""}>{m.subject}</strong><span className="muted">{m.from}</span></span>
                <span className="when">{m.time}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
