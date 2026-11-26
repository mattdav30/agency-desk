import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { api, type AdClient, type Ads } from "../api";
import { useApp } from "../ctx";
import { Icon } from "../icons";
import { Bar, Card, CountUp, PageHead, Reveal } from "../ui";
import { UploadPanel } from "../adsui";
import { ConfirmDelete } from "../forms";
import { paceWord } from "../../shared/ads";
import { href } from "../hooks";
import { monthName, money, niceDate, symbol } from "../util";

const addMonths = (m: string, n: number) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Pace bar and word for one client, or a prompt to set a budget. */
export function PaceCell({ c, expected, showMarker, delay = 0 }: { c: AdClient; expected: number; showMarker: boolean; delay?: number }) {
  if (!c.budget) return <span className="muted">Add a budget to see pace</span>;
  return (
    <div className="pace">
      <Bar value={c.spent / c.budget} marker={showMarker ? expected : undefined} delay={delay} />
      <span className="label">{paceWord(c.spent, c.budget, expected)}</span>
    </div>
  );
}

function BudgetCell({ c, month, onSaved }: { c: AdClient; month: string; onSaved: () => void }) {
  const { notify } = useApp();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const open = () => { setV(String(c.budget ?? "")); setEditing(true); };
  const save = async (e: FormEvent, value = v) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/budgets", "PUT", { clientId: c.id, month, amount: value === "" ? null : Number(value) }); setEditing(false); onSaved(); }
    catch (err) { notify((err as Error).message); }
    finally { setBusy(false); }
  };
  if (!editing) {
    return (
      <button className="btn small" onClick={open} aria-label={`${c.budget ? "Edit" : "Set"} budget for ${c.name}`}>
        {c.budget ? <>{money(c.budget, c.currency)}<Icon name="pen" size={14} /></> : <><Icon name="plus" size={14} />Set budget</>}
      </button>
    );
  }
  return (
    <form className="budget-edit" onSubmit={save}>
      <input autoFocus type="number" inputMode="decimal" min="0" step="any" value={v} onChange={(e) => setV(e.target.value)} placeholder={symbol(c.currency)} aria-label={`Budget for ${c.name} in ${monthName(month, true)}`} />
      <button className="btn small amber" disabled={busy}>Save</button>
      {c.lastBudget && !c.budget && <button type="button" className="btn small" disabled={busy} onClick={(e) => save(e, String(c.lastBudget))}>Use {money(c.lastBudget, c.currency)}</button>}
      <button type="button" className="btn small" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}

export function AdSpendPage() {
  const { notify, refreshAds } = useApp();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<Ads | null>(null);
  const [failed, setFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cur, setCur] = useState<string | null>(null);

  const load = useCallback(async (m: string | null) => {
    try { setData(await api<Ads>(`/ads${m ? `?month=${m}` : ""}`)); setFailed(false); } catch { setFailed(true); }
  }, []);
  useEffect(() => { load(month); }, [month, load]);
  const changed = async () => { await Promise.all([load(month), refreshAds()]); };

  const groups = useMemo(() => {
    const m = new Map<string, AdClient[]>();
    for (const c of data?.clients ?? []) m.set(c.currency, [...(m.get(c.currency) ?? []), c]);
    return [...m.entries()];
  }, [data]);

  const trendCurrencies = useMemo(() => [...new Set((data?.trend ?? []).map((t) => t.currency))], [data]);
  const trendCur = cur && trendCurrencies.includes(cur) ? cur : trendCurrencies[0];
  const months6 = data ? Array.from({ length: 6 }, (_, i) => addMonths(data.month, i - 5)) : [];
  const bars = months6.map((m) => ({ m, value: data?.trend.find((t) => t.month === m && t.currency === trendCur)?.total ?? 0 }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  const isCurrent = !!data && data.month === data.today.slice(0, 7);

  return (
    <>
      <PageHead label="Ad spend" title="Spend and pace" lede="Upload an export from any ad platform. Spend stays in each client's own currency." action={
        <button className="btn amber" onClick={() => setUploading(!uploading)}><Icon name={uploading ? "close" : "upload"} size={16} />{uploading ? "Close" : "Upload export"}</button>
      } />

      {uploading && (
        <div className="panel-form">
          <Card title="Upload an export" tilt={false}>
            <UploadPanel onClose={() => setUploading(false)} onSaved={async () => { setUploading(false); setMonth(null); await Promise.all([load(null), refreshAds()]); }} />
          </Card>
        </div>
      )}

      {failed && <p className="empty">Ad spend is taking a moment to load. Refresh to try again.</p>}
      {!data && !failed && <p className="empty">Loading</p>}

      {data && (
        <>
          <ul className="topics month-pills" aria-label="Month">
            {data.months.slice(0, 12).map((m) => (
              <li key={m}><button className={`pill small ${m === data.month ? "active" : ""}`} aria-pressed={m === data.month} onClick={() => setMonth(m)}>{monthName(m)} {m.slice(0, 4)}</button></li>
            ))}
          </ul>

          {data.imports.length === 0 && !uploading && (
            <Reveal><p className="soon"><span className="label">Start here</span>Upload your first export. LinkedIn and Meta files are read automatically. Any other source takes one extra step the first time, then Jarvis remembers it.</p></Reveal>
          )}

          <div className="grid two">
            <Card title={monthName(data.month, true)} label={isCurrent ? "This month" : "Past month"} delay={0}>
              {groups.length === 0 && <p className="empty">No spend in this month yet.</p>}
              {groups.map(([currency, list]) => {
                const budgeted = list.filter((c) => c.budget);
                const spent = sum(list.map((c) => c.spent));
                const budget = sum(budgeted.map((c) => c.budget!));
                const used = sum(budgeted.map((c) => c.spent));
                return (
                  <div key={currency} className="cur-block">
                    <span className="label">{currency}</span>
                    <div className="big"><CountUp to={spent} prefix={symbol(currency)} decimals={2} /> {budget > 0 && <small>of {money(budget, currency)}</small>}</div>
                    {budget > 0 ? (
                      <>
                        <Bar value={used / budget} marker={isCurrent ? data.expected : undefined} />
                        <p className="label mt">{paceWord(used, budget, data.expected)}{budgeted.length < list.length ? `, budget set for ${budgeted.length} of ${list.length} clients` : ""}</p>
                      </>
                    ) : <p className="muted">Set a budget below to see pace.</p>}
                  </div>
                );
              })}
            </Card>

            <Card title="Last six months" label={trendCur ?? ""} delay={0.08} action={trendCurrencies.length > 1 ? (
              <span className="tabs">{trendCurrencies.map((c) => <button key={c} className={`pill small ${c === trendCur ? "active" : ""}`} onClick={() => setCur(c)}>{c}</button>)}</span>
            ) : undefined}>
              {trendCurrencies.length === 0 ? <p className="empty">Months appear here after your first upload.</p> : (
                <div className="columns" role="img" aria-label={`Monthly spend in ${trendCur}`}>
                  {bars.map((b, i) => (
                    <div key={b.m} className="col">
                      <span className="label">{b.value ? money(b.value, trendCur, 0) : ""}</span>
                      <motion.i initial={{ height: 0 }} whileInView={{ height: `${(b.value / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }} />
                      <span className="label">{monthName(b.m)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="By client" label={monthName(data.month, true)} className="wide" delay={0.05}>
              {data.clients.length === 0 ? <p className="empty">Clients with spend or a budget appear here.</p> : (
                <div className="scroll">
                  <table>
                    <thead><tr><th>Client</th><th>Channels</th><th className="num">Spent</th><th>Budget</th><th>Pace</th></tr></thead>
                    <tbody>
                      {data.clients.map((c, i) => (
                        <tr key={c.id}>
                          <td><a className="cell-link" href={href("clients", c.name)}><strong>{c.name}</strong></a></td>
                          <td className="muted">{c.channels.join(", ") || "None"}</td>
                          <td className="num">{money(c.spent, c.currency, 2)}</td>
                          <td><BudgetCell c={c} month={data.month} onSaved={changed} /></td>
                          <td><PaceCell c={c} expected={data.expected} showMarker={isCurrent} delay={i * 0.06} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Imports" label={`${data.imports.length} files`} className="wide" delay={0.1}>
              {data.imports.length === 0 ? <p className="empty">Every file you upload is kept here, with the original for download.</p> : (
                <ul className="list">
                  {data.imports.map((i) => (
                    <li key={i.id} className="import-row">
                      <span>
                        <strong>{i.filename}</strong>
                        <span className="muted">{i.source} for {i.client_name ?? "a removed client"}, {i.period_start ? `${niceDate(i.period_start)} to ${niceDate(i.period_end ?? i.period_start)}` : "no dates"}, {i.row_count} rows, {money(i.total_spend, i.currency ?? "AUD", 2)}{i.live === 0 ? ". Replaced by a newer file." : ""}</span>
                      </span>
                      <span className="row-actions">
                        <a className="btn small" href={`/api/imports/${i.id}/file`} download><Icon name="arrow" size={14} />Original</a>
                        <ConfirmDelete onConfirm={async () => { try { await api(`/imports/${i.id}`, "DELETE"); notify(`${i.filename} deleted.`); changed(); } catch (e) { notify((e as Error).message); } }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
