import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useIsMobile } from "./hooks";

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts into view on load or scroll. Stagger with `delay`. */
export function Reveal({ children, delay = 0, className = "", as = "div", y = 28 }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "article"; y?: number }) {
  const M = motion[as] as typeof motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y, filter: "blur(6px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.8, delay, ease }}>
      {children}
    </M>
  );
}

/** Number that counts up when it scrolls into view. */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, duration = 1.6 }: { to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduced = useReducedMotion();
  const fmt = (n: number) => prefix + n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { el.textContent = fmt(to); return; }
    if (!inView) return;
    const c = animate(0, to, { duration, ease, onUpdate: (v) => { el.textContent = fmt(v); } });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, to]);
  return <span ref={ref}>{fmt(reduced ? to : 0)}</span>;
}

/** Progress bar that fills when it appears. Optional marker for expected pace. */
export function Bar({ value, marker, delay = 0 }: { value: number; marker?: number; delay?: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.i initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, value * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1.3, delay: 0.2 + delay, ease }} />
      {marker !== undefined && <b style={{ left: `${marker * 100}%` }} />}
    </div>
  );
}

/** Panel with a mouse driven 3D tilt, a light glare and an amber glow on hover. */
export function Card({ title, label, children, className = "", delay = 0, action, tilt = true }: { title?: string; label?: string; children: ReactNode; className?: string; delay?: number; action?: ReactNode; tilt?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsMobile();
  const live = tilt && !reduced && !coarse;

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !live) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <Reveal delay={delay} className={`card-wrap ${className}`}>
      <section ref={ref} className="card" onPointerMove={move} onPointerLeave={leave} style={{ "--rx": "0deg", "--ry": "0deg", "--mx": "50%", "--my": "50%" } as CSSProperties}>
        <span className="glare" aria-hidden="true" />
        {(title || action) && (
          <header className="card-head">
            <h2>{title}</h2>
            <div className="head-right">{label && <span className="label">{label}</span>}{action}</div>
          </header>
        )}
        {children}
      </section>
    </Reveal>
  );
}

export function PageHead({ label, title, lede, action }: { label: string; title: string; lede: string; action?: ReactNode }) {
  return (
    <header className="page-head">
      <Reveal><p className="label">{label}</p></Reveal>
      <Reveal delay={0.08}><h1>{title}</h1></Reveal>
      <Reveal delay={0.16}><p className="lede">{lede}</p></Reveal>
      {action && <Reveal delay={0.24}>{action}</Reveal>}
    </header>
  );
}

export function Soon({ phase, children }: { phase: number; children?: ReactNode }) {
  return <p className="soon"><span className="label">Coming in Phase {phase}</span>{children}</p>;
}
