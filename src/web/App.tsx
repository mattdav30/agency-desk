import { useEffect, useState } from "react";

type Health = { ok: boolean; checks: { db: boolean; kv: boolean } };

const rows: [keyof Health["checks"], string][] = [
  ["db", "Database"],
  ["kv", "Settings store"],
];

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="wrap">
      <svg className="mark" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
      <p className="label">Phase 0</p>
      <h1>Agency Desk</h1>
      <p className="lede">The workspace is live. Here is the state of each part.</p>
      <ul className="checks">
        {rows.map(([key, name]) => {
          const state = failed ? "off" : health ? (health.checks[key] ? "on" : "off") : "wait";
          return (
            <li key={key}>
              <span>{name}</span>
              <span className={`pill ${state}`}>{state === "on" ? "Connected" : state === "wait" ? "Checking" : "Needs setup"}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
