import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "./icons";
import { CURRENCIES } from "../shared/ads";
import { useApp, type Client, type ClientInput, type Report, type ReportInput, type Task, type TaskInput } from "./ctx";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span className="label">{label}</span>{children}</label>;
}

function Actions({ busy, submit, onCancel }: { busy: boolean; submit: string; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button className="btn small amber" disabled={busy}>{busy ? "Saving" : submit}</button>
      <button type="button" className="btn small" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/** Delete button that asks for a second tap. */
export function ConfirmDelete({ onConfirm, label = "Delete", small = true }: { onConfirm: () => void; label?: string; small?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button className={`btn ${small ? "small" : ""}`} onClick={() => setAsking(true)}><Icon name="trash" size={14} />{label}</button>;
  return (
    <span className="row-actions">
      <button className="btn small danger" onClick={onConfirm}>Yes, delete</button>
      <button className="btn small" onClick={() => setAsking(false)}>Keep</button>
    </span>
  );
}

export function ClientForm({ client, onDone }: { client?: Client; onDone: (saved?: Client) => void }) {
  const { addClient, updateClient } = useApp();
  const [v, setV] = useState<ClientInput>({ name: client?.name ?? "", channels: client?.channels ?? "", note: client?.note ?? "", currency: client?.currency ?? "AUD" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (client) { const ok = await updateClient(client.id, v); setBusy(false); if (ok) onDone({ ...client, ...v }); }
    else { const c = await addClient(v); setBusy(false); if (c) onDone(c); }
  };
  return (
    <form className="form" onSubmit={submit}>
      <Field label="Name"><input autoFocus required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} /></Field>
      <Field label="Channels"><input value={v.channels} onChange={(e) => setV({ ...v, channels: e.target.value })} placeholder="Google Ads, Meta" maxLength={200} /></Field>
      <Field label="Ad spend currency">
        <select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea rows={3} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={500} /></Field>
      <Actions busy={busy} submit={client ? "Save client" : "Add client"} onCancel={() => onDone()} />
    </form>
  );
}

export function TaskForm({ task, defaultClientId = null, onDone }: { task?: Task; defaultClientId?: number | null; onDone: () => void }) {
  const { clients, addTask, updateTask, today } = useApp();
  const [v, setV] = useState<TaskInput>({ title: task?.title ?? "", clientId: task ? task.clientId : defaultClientId, dueDate: task ? task.dueDate : today });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return;
    setBusy(true);
    const ok = task ? await updateTask(task.id, v) : await addTask(v);
    setBusy(false);
    if (ok) onDone();
  };
  return (
    <form className="form" onSubmit={submit}>
      <Field label="Task"><input autoFocus required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={200} /></Field>
      <div className="form-row">
        <Field label="Client">
          <select value={v.clientId ?? ""} onChange={(e) => setV({ ...v, clientId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">General</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Due">
          <input type="date" value={v.dueDate ?? ""} onChange={(e) => setV({ ...v, dueDate: e.target.value || null })} />
        </Field>
      </div>
      <Actions busy={busy} submit={task ? "Save task" : "Add task"} onCancel={onDone} />
    </form>
  );
}

export function ReportForm({ report, defaultClientId = null, onDone }: { report?: Report; defaultClientId?: number | null; onDone: () => void }) {
  const { clients, addReport, updateReport } = useApp();
  const [v, setV] = useState<ReportInput>({
    name: report?.name ?? "",
    clientId: report ? report.clientId : defaultClientId,
    clientLabel: report?.clientLabel ?? "",
    frequency: report?.frequency ?? "daily",
    dueTime: report?.dueTime ?? "",
    dueDay: report?.dueDay ?? null,
  });
  const [busy, setBusy] = useState(false);
  const day = v.frequency === "weekly" ? v.dueDay ?? 1 : v.frequency === "monthly" ? v.dueDay ?? 0 : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const input = { ...v, dueDay: day };
    const ok = report ? await updateReport(report.id, input) : await addReport(input);
    setBusy(false);
    if (ok) onDone();
  };
  return (
    <form className="form" onSubmit={submit}>
      <Field label="Report name"><input autoFocus required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} /></Field>
      <div className="form-row">
        <Field label="Client">
          <select value={v.clientId ?? ""} onChange={(e) => setV({ ...v, clientId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Other</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {v.clientId === null && <Field label="Name for other"><input value={v.clientLabel} onChange={(e) => setV({ ...v, clientLabel: e.target.value })} maxLength={80} /></Field>}
      </div>
      <div className="form-row">
        <Field label="Repeats">
          <select value={v.frequency} onChange={(e) => setV({ ...v, frequency: e.target.value as ReportInput["frequency"], dueDay: null })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        {v.frequency === "weekly" && (
          <Field label="On">
            <select value={day ?? 1} onChange={(e) => setV({ ...v, dueDay: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
        )}
        {v.frequency === "monthly" && (
          <Field label="On">
            <select value={day ?? 0} onChange={(e) => setV({ ...v, dueDay: Number(e.target.value) })}>
              <option value={0}>Last day of the month</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
            </select>
          </Field>
        )}
        <Field label="Time (optional)"><input type="time" value={v.dueTime} onChange={(e) => setV({ ...v, dueTime: e.target.value })} /></Field>
      </div>
      <Actions busy={busy} submit={report ? "Save report" : "Add report"} onCancel={onDone} />
    </form>
  );
}
