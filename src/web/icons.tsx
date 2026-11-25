import type { ReactNode } from "react";

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

const paths: Record<string, ReactNode> = {
  logo: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
  send: <path d="M4 12h15M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M7 17L17 7M9 7h8v8" />,
  pen: <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  bookmark: <path d="M7 4h10v16l-5-4-5 4z" />,
};

export function Icon({ name, size = 18, filled = false }: { name: keyof typeof paths; size?: number; filled?: boolean }) {
  return <svg {...base} width={size} height={size} fill={filled ? "currentColor" : "none"}>{paths[name]}</svg>;
}
