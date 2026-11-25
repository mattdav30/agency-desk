import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { useIsMobile, useReduced } from "./hooks";

/** Flowing ribbons of light and drifting dust, drawn on a 2D canvas behind the greeting. */
export function HeroField() {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrap, { margin: "100px" });
  const mobile = useIsMobile();
  const reduced = useReduced();
  const visible = useRef(true);
  visible.current = inView;

  useEffect(() => {
    const canvas = cvs.current, box = wrap.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    let w = 0, h = 0, raf = 0;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const ribbons = [
      { color: "242,169,59", amp: 46, freq: 1.3, speed: 0.22, y: 0.38, phase: 0 },
      { color: "110,168,254", amp: 62, freq: 0.95, speed: 0.17, y: 0.55, phase: 2.1 },
      { color: "242,169,59", amp: 34, freq: 1.8, speed: 0.28, y: 0.7, phase: 4.2 },
    ];
    const dust = Array.from({ length: mobile ? 36 : 90 }, () => ({
      x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, s: 0.05 + Math.random() * 0.12,
      c: Math.random() > 0.5 ? "242,169,59" : "110,168,254",
    }));
    const pulses = ribbons.flatMap((_, i) => Array.from({ length: mobile ? 2 : 4 }, (_, k) => ({ r: i, t: (k / 4 + i * 0.13) % 1, v: 0.04 + Math.random() * 0.05 })));

    const size = () => {
      w = box.clientWidth; h = box.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const yAt = (r: (typeof ribbons)[number], x: number, t: number) =>
      h * r.y + Math.sin(x * r.freq * 5 + t * r.speed * 6 + r.phase) * r.amp * (0.6 + mouse.y * 0.8) +
      Math.sin(x * r.freq * 11 - t * r.speed * 4) * r.amp * 0.25;

    const draw = (time: number) => {
      const t = time / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const r of ribbons) {
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          for (let i = 0; i <= 80; i++) {
            const x = i / 80;
            const px = x * w, py = yAt(r, x, t) + layer * 5 * (mouse.x - 0.5) * 2;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.strokeStyle = `rgba(${r.color},${[0.4, 0.12, 0.05][layer]})`;
          ctx.lineWidth = [1.2, 4, 10][layer];
          ctx.stroke();
        }
      }
      for (const p of pulses) {
        p.t = (p.t + p.v * 0.016) % 1;
        const r = ribbons[p.r], px = p.t * w, py = yAt(r, p.t, t);
        const g = ctx.createRadialGradient(px, py, 0, px, py, 14);
        g.addColorStop(0, `rgba(${r.color},0.9)`); g.addColorStop(1, `rgba(${r.color},0)`);
        ctx.fillStyle = g; ctx.fillRect(px - 14, py - 14, 28, 28);
      }
      for (const d of dust) {
        d.y -= d.s * 0.0016 * d.z; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        const px = (d.x + (mouse.x - 0.5) * 0.04 * d.z) * w, py = d.y * h;
        ctx.fillStyle = `rgba(${d.c},${0.15 + d.z * 0.4})`;
        ctx.beginPath(); ctx.arc(px, py, d.z * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (visible.current && !document.hidden) draw(time);
    };
    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      mouse.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      mouse.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    };
    size();
    const ro = new ResizeObserver(() => { size(); if (reduced) draw(2000); });
    ro.observe(box);
    if (reduced) draw(2000);
    else { raf = requestAnimationFrame(loop); window.addEventListener("pointermove", onMove); }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, [mobile, reduced]);

  return (
    <div ref={wrap} className="hero-field" aria-hidden="true">
      <canvas ref={cvs} />
    </div>
  );
}
