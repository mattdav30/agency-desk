import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { useApp } from "../ctx";
import { Bar, Card, PageHead, Reveal, Soon } from "../ui";
import { emails } from "../seed";
import { dueLabel, money, monthName } from "../util";
import { PaceCell } from "./AdSpend";
import { href } from "../hooks";
import { ClientForm, ConfirmDelete, ReportForm, TaskForm } from "../forms";
import { TaskList } from "../tasklist";

export function Clients({ selected }: { selected?: string }) {
  const { clients, tasks, reports, ready, removeClient, notify, ads } = useApp();
  const now = useMemo(() => new Date(), []);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [addingReport, setAddingReport] = useState(false);

  const client = selected ? clients.find((c) => c.name === selected) : undefined;

  if (selected && !client) {
    return (
      <>
        <Reveal><a className="back" href={href("clients")}><Icon name="back" size={16} />All clients</a></Reveal>
        <PageHead label="Client" title={ready ? "Client missing" : "Loading"} lede={ready ? "That client has been renamed or removed. Pick one from the list." : "Fetching your clients."} />
      </>
    );
  }

  if (client) {
    const spend = ads?.clients.find((a) => a.id === client.id);
    const cTasks = tasks.filter((t) => t.clientId === client.id);
    const cReports = reports.filter((r) => r.clientId === client.id);
    const cMail = emails.filter((e) => e.client === client.name);
    const nextTask = cTasks.find((t) => !t.done);
    return (
      <>
        <Reveal><a className="back" href={href("clients")}><Icon name="back" size={16} />All clients</a></Reveal>
        <PageHead label="Client" title={client.name} lede={client.note || "Add a note to remember what matters for this client."} action={
          <div className="row-actions">
            <button className="btn small" onClick={() => setEditing(!editing)}><Icon name="pen" size={14} />Edit</button>
            <ConfirmDelete onConfirm={async () => { if (await removeClient(client.id)) { notify(`${client.name} deleted. Its tasks and reports stay in place.`); window.location.hash = href("clients"); } }} />
          </div>
        } />
        {editing && <div className="panel-form"><Card title="Edit client" tilt={false}><ClientForm client={client} onDone={(saved) => { setEditing(false); if (saved && saved.name !== client.name) window.location.hash = href("clients", saved.name); }} /></Card></div>}
        <div className="grid two">
          <Card title="Channels" delay={0}>
            <p className="lede small">{client.channels || "No channels added yet."}</p>
            <p className="muted">{nextTask ? `Next: ${nextTask.title}` : "No open tasks."}</p>
          </Card>
          <Card title="Ad spend" label={ads ? monthName(ads.month, true) : "This month"} delay={0.08} action={<a className="more" href={href("ad-spend")}>Details</a>}>
            {spend ? (
              <>
                <div className="big">{money(spend.spent, spend.currency, 2)} {spend.budget && <small>of {money(spend.budget, spend.currency)}</small>}</div>
                <PaceCell c={spend} expected={ads!.expected} showMarker />
                <p className="muted mt">{spend.channels.join(", ")}</p>
              </>
            ) : <p className="empty">{ads ? "No spend this month. Upload an export on the Ad spend page." : "Loading"}</p>}
          </Card>
          <Card title="Tasks" delay={0.16}>
            <TaskList tasks={cTasks} showClient={false} empty="No tasks yet for this client." />
            {addingTask ? <TaskForm defaultClientId={client.id} onDone={() => setAddingTask(false)} /> : <button className="btn" onClick={() => setAddingTask(true)}><Icon name="plus" size={16} />Add task</button>}
          </Card>
          <Card title="Reports" delay={0.24} action={<a className="more" href={href("reports")}>All reports</a>}>
            {cReports.length ? <ul className="list">{cReports.map((r) => <li key={r.id}><span><strong>{r.name}</strong><span className="muted">{r.schedule}</span></span><span className="when">{dueLabel(now, r.days, r.at)}</span></li>)}</ul> : <p className="empty">No reports set for this client.</p>}
            {addingReport ? <ReportForm defaultClientId={client.id} onDone={() => setAddingReport(false)} /> : <button className="btn" onClick={() => setAddingReport(true)}><Icon name="plus" size={16} />Add report</button>}
          </Card>
          <Card title="Inbox" label="Sample" className="wide" delay={0.3}>
            {cMail.length ? <ul className="list">{cMail.map((m) => <li key={m.id}><span><strong>{m.subject}</strong><span className="muted">{m.from}</span></span><span className="when">{m.time}</span></li>)}</ul> : <p className="empty">No waiting emails.</p>}
            <Soon phase={6}>Real emails link to clients here.</Soon>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead label="Clients" title="Your clients" lede={ready ? `${clients.length} ${clients.length === 1 ? "client" : "clients"}, each linked to tasks, reports and ad spend.` : "Fetching your clients."} action={
        <button className="btn amber" onClick={() => setAdding(!adding)}><Icon name={adding ? "close" : "plus"} size={16} />{adding ? "Close" : "Add client"}</button>
      } />
      {adding && <div className="panel-form"><Card title="New client" tilt={false}><ClientForm onDone={(saved) => { setAdding(false); if (saved) notify(`${saved.name} added.`); }} /></Card></div>}
      <div className="grid">
        {clients.map((c, i) => {
          const spend = ads?.clients.find((a) => a.id === c.id);
          const open = tasks.filter((t) => t.clientId === c.id && !t.done);
          return (
            <Card key={c.id} delay={i * 0.06}>
              <a className="client-card" href={href("clients", c.name)}>
                <span className="label">{c.channels || "Add channels"}</span>
                <h3>{c.name}</h3>
                <p className="muted">{c.note || "Add a note on the client page."}</p>
                <span className="when"><Icon name="clock" size={14} />{open[0] ? open[0].title : "No open tasks"}</span>
                {spend?.budget && <Bar value={spend.spent / spend.budget} delay={i * 0.06} />}
              </a>
            </Card>
          );
        })}
      </div>
    </>
  );
}
