import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { useApp } from "../ctx";
import { Card, PageHead, Reveal, Soon } from "../ui";
import { emails } from "../seed";
import { ConfirmDelete, ReportForm } from "../forms";
import { dueLabel } from "../util";
import { href } from "../hooks";

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
