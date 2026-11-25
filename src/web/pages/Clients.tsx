import { useMemo } from "react";
import { Icon } from "../icons";
import { useApp } from "../ctx";
import { Bar, Card, PageHead, Reveal, Soon } from "../ui";
import { adSpend, clientNotes, clients, emails, reportsDue } from "../seed";
import { dueLabel, money, monthProgress, paceStatus } from "../util";
import { href } from "../hooks";

export function Clients({ selected }: { selected?: string }) {
  const { notify, tasks } = useApp();
  const now = useMemo(() => new Date(), []);

  if (selected && clients.includes(selected)) {
    const info = clientNotes[selected];
    const spend = adSpend.find((a) => a.client === selected);
    const cTasks = tasks.filter((t) => t.client === selected);
    const cReports = reportsDue.filter((r) => r.client === selected);
    const cMail = emails.filter((e) => e.client === selected);
    const expected = monthProgress(now);
    return (
      <>
        <Reveal><a className="back" href={href("clients")}><Icon name="back" size={16} />All clients</a></Reveal>
        <PageHead label="Client" title={selected} lede={info.note} action={
          <div className="row-actions">
            <button className="btn small" onClick={() => notify("Editing clients arrives in Phase 2.")}><Icon name="pen" size={14} />Edit</button>
            <button className="btn small" onClick={() => notify("Deleting clients arrives in Phase 2.")}><Icon name="trash" size={14} />Delete</button>
          </div>
        } />
        <div className="grid two">
          <Card title="Channels" delay={0}><p className="lede small">{info.channels}</p><p className="muted">Next: {info.next}</p></Card>
          <Card title="Ad spend" label="This month" delay={0.08}>
            {spend ? (
              <>
                <div className="big">{money(spend.spent)} <small>of {money(spend.budget)}</small></div>
                <Bar value={spend.spent / spend.budget} marker={expected} />
                <p className="label mt">{paceStatus(spend.spent / spend.budget, expected)}</p>
              </>
            ) : <Soon phase={3}>Spend appears once you upload an export.</Soon>}
          </Card>
          <Card title="Tasks" delay={0.16}>
            {cTasks.length ? <ul className="list">{cTasks.map((t) => <li key={t.id}><span><strong>{t.title}</strong></span><span className="when">{t.time}</span></li>)}</ul> : <p className="muted">No tasks yet for this client.</p>}
          </Card>
          <Card title="Reports" delay={0.24}>
            {cReports.length ? <ul className="list">{cReports.map((r) => <li key={r.id}><span><strong>{r.name}</strong><span className="muted">{r.schedule}</span></span><span className="when">{dueLabel(now, r.days, r.at)}</span></li>)}</ul> : <p className="muted">No reports set for this client.</p>}
          </Card>
          <Card title="Inbox" className="wide" delay={0.3}>
            {cMail.length ? <ul className="list">{cMail.map((m) => <li key={m.id}><span><strong>{m.subject}</strong><span className="muted">{m.from}</span></span><span className="when">{m.time}</span></li>)}</ul> : <p className="muted">No waiting emails.</p>}
            <Soon phase={6}>Real emails link to clients here.</Soon>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead label="Clients" title="Your clients" lede={`${clients.length} clients, each linked to tasks, reports and ad spend.`} action={
        <button className="btn amber" onClick={() => notify("Adding clients arrives in Phase 2. Today they come from the starting list.")}><Icon name="plus" size={16} />Add client</button>
      } />
      <div className="grid">
        {clients.map((c, i) => {
          const spend = adSpend.find((a) => a.client === c);
          return (
            <Card key={c} delay={i * 0.06}>
              <a className="client-card" href={href("clients", c)}>
                <span className="label">{clientNotes[c].channels}</span>
                <h3>{c}</h3>
                <p className="muted">{clientNotes[c].note}</p>
                <span className="when"><Icon name="clock" size={14} />{clientNotes[c].next}</span>
                {spend && <Bar value={spend.spent / spend.budget} delay={i * 0.06} />}
              </a>
            </Card>
          );
        })}
      </div>
    </>
  );
}
