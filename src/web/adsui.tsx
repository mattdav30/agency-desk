import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { api, upload } from "./api";
import { useApp } from "./ctx";
import { Icon } from "./icons";
import {
  CURRENCIES, FIELD_LABELS, REQUIRED, SOURCES, cellText, decodeText, detectCurrency, detectDateFormat, detectSource, guessColumns,
  matchClient, normalise, parseDelimited, splitByMonth, toTable, type Columns, type DateFormat, type Field, type Mapping, type Table,
} from "../shared/ads";
import { money, niceDate } from "./util";

type Saved = { mappings: Record<string, Mapping>; accountClients: Record<string, number> };
const FIELD_ORDER: Field[] = ["date", "dateEnd", "spend", "campaign", "adSet", "impressions", "clicks", "account", "currency"];
const FORMATS: { id: DateFormat; label: string }[] = [
  { id: "iso", label: "Year first (2026-11-24)" },
  { id: "mdy", label: "Month first (11/24/2026)" },
  { id: "dmy", label: "Day first (24/11/2026)" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span className="label">{label}</span>{children}</label>;
}

/** Choose an export, check what was read, save. Known sources need one tap. */
export function UploadPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { clients, notify } = useApp();
  const [saved, setSaved] = useState<Saved>({ mappings: {}, accountClients: {} });
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [source, setSource] = useState("");
  const [columns, setColumns] = useState<Columns>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>("dmy");
  const [currency, setCurrency] = useState("AUD");
  const [clientId, setClientId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => { api<Saved>("/ads/mappings").then(setSaved).catch(() => {}); }, []);

  async function read(f: File) {
    setBusy(true);
    try {
      let grid: string[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        grid = (await readSheet(f)).map((r) => r.map(cellText));
      } else if (/\.xls$/i.test(f.name)) {
        throw new Error("Save that file as xlsx or csv, then upload it again.");
      } else grid = parseDelimited(decodeText(await f.arrayBuffer()));
      const t = toTable(grid);
      if (!t.headers.length || !t.rows.length) throw new Error("That file had no readable rows.");

      const src = detectSource(t);
      const sv = saved.mappings[src];
      const usable = !!sv && Object.values(sv.columns).every((h) => t.headers.includes(h as string));
      const cols = usable ? sv.columns : guessColumns(t.headers);
      const fmt = detectDateFormat(t.rows.map((r) => r[t.headers.indexOf(cols.date ?? "")] ?? ""));
      const detected = detectCurrency(t, cols) || (usable ? sv.currency : "");
      const first = normalise(t, { columns: cols, dateFormat: fmt, currency: detected || "AUD" });
      const stem = f.name.replace(/\.[^.]+$/, "");
      const cid = saved.accountClients[`${src}|${first.accounts[0] || stem}`] ?? matchClient(first.accounts[0] ?? "", clients) ?? matchClient(stem, clients) ?? null;

      setFile(f); setTable(t); setSource(src); setColumns(cols); setDateFormat(fmt); setClientId(cid);
      setCurrency(detected || clients.find((c) => c.id === cid)?.currency || "AUD");
    } catch (e) {
      notify((e as Error).message || "That file could not be read. Try a CSV or xlsx export.");
    } finally { setBusy(false); }
  }

  const norm = useMemo(() => (table ? normalise(table, { columns, dateFormat, currency }) : null), [table, columns, dateFormat, currency]);
  const stem = file?.name.replace(/\.[^.]+$/, "") ?? "";
  const accountKey = norm?.accounts[0] || stem;
  const missing = REQUIRED.filter((f) => !columns[f]);
  const client = clients.find((c) => c.id === clientId);
  const splits = norm ? norm.rows.filter((r) => splitByMonth(r).length > 1).length : 0;
  const ready = !!(norm && norm.rows.length && source.trim() && clientId && !missing.length);

  async function save() {
    if (!file || !norm || !ready) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("meta", JSON.stringify({ source: source.trim(), clientId, currency, accountKey, mapping: { columns, dateFormat, currency }, rows: norm.rows, skipped: norm.skipped }));
      const r = await upload<{ rows: number; replaced: number; total: number; currency: string; client: string; start: string; end: string }>("/imports", form);
      notify(`${r.client}: saved ${r.rows} rows, ${money(r.total, r.currency, 2)}, from ${niceDate(r.start)} to ${niceDate(r.end)}.${r.replaced ? ` ${r.replaced} earlier rows were replaced.` : ""}`);
      onSaved();
    } catch (e) { notify((e as Error).message); }
    finally { setBusy(false); }
  }

  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) read(f); };

  if (!file || !table || !norm) {
    return (
      <div className="form">
        <label className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <Icon name="upload" size={26} />
          <strong>{busy ? "Reading the file" : "Drop an export here or choose a file"}</strong>
          <span className="muted">CSV, TSV or XLSX. LinkedIn and Meta files are read automatically.</span>
          <input className="sr-only" type="file" accept=".csv,.tsv,.txt,.xlsx" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
        </label>
        <div className="form-actions"><button type="button" className="btn small" onClick={onClose}>Cancel</button></div>
      </div>
    );
  }

  const preview = norm.rows.slice(0, 5);
  return (
    <div className="form">
      <p className="summary-line">
        <span className="muted">{file.name}</span>
        <strong>{norm.rows.length} rows</strong>
        {norm.start && <span>{niceDate(norm.start)} to {niceDate(norm.end)}</span>}
        <span className="amber">{money(norm.total, currency, 2)}</span>
      </p>

      <div className="form-row">
        <Field label="Source">
          <input list="ad-sources" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Meta, Google Ads" maxLength={40} />
          <datalist id="ad-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Client">
          <select value={clientId ?? ""} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Pick a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {[...new Set([...CURRENCIES, currency])].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {client && client.currency !== currency && <p className="muted">{client.name} is set to {client.currency}. It switches to {currency} on save, as long as it has no spend saved yet.</p>}
      {!source.trim() && <p className="muted">Name the source once. Jarvis remembers the column layout for next time.</p>}
      {splits > 0 && <p className="muted">{splits} {splits === 1 ? "row covers" : "rows cover"} two months. Spend is split by days across them.</p>}
      {norm.skipped > 0 && <p className="muted">{norm.skipped} {norm.skipped === 1 ? "row was" : "rows were"} skipped because the date or spend was unreadable.</p>}

      <details className="map" open={missing.length > 0}>
        <summary>{missing.length ? `Pick the ${missing.map((m) => FIELD_LABELS[m].toLowerCase()).join(" and ")} column` : "Check columns"}</summary>
        <div className="map-grid">
          {FIELD_ORDER.map((f) => (
            <Field key={f} label={`${FIELD_LABELS[f]}${REQUIRED.includes(f) ? " (needed)" : ""}`}>
              <select value={columns[f] ?? ""} onChange={(e) => setColumns((c) => ({ ...c, [f]: e.target.value || undefined }))}>
                <option value="">None</option>
                {table.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
          ))}
          <Field label="Date order">
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
              {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </Field>
        </div>
      </details>

      {preview.length > 0 && (
        <div className="scroll">
          <table className="preview">
            <thead><tr><th>Date</th><th>Campaign</th><th>Ad set</th><th className="num">Spend</th></tr></thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i}><td>{niceDate(r.d)}{r.e ? ` to ${niceDate(r.e)}` : ""}</td><td className="muted">{r.c || "None"}</td><td className="muted">{r.a || "None"}</td><td className="num">{money(r.s, currency, 2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">Newer files replace earlier rows from the same source and client on the same dates. The original file is kept.</p>

      <div className="form-actions">
        <button type="button" className="btn small amber" disabled={!ready || busy} onClick={save}>{busy ? "Saving" : "Save import"}</button>
        <button type="button" className="btn small" disabled={busy} onClick={() => { setFile(null); setTable(null); }}>Choose another file</button>
        <button type="button" className="btn small" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
