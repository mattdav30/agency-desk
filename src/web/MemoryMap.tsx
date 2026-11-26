import { Component, lazy, Suspense, useRef, type ReactNode } from "react";
import { useInView } from "framer-motion";
import { useApp } from "./ctx";
import { useIsMobile, useReduced, href } from "./hooks";

// The 3D scene (three.js) loads only when the map nears the screen.
const Scene = lazy(() => import("./scene/MemoryScene"));

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Poster({ text }: { text: string }) {
  return <div className="scene-poster"><span className="orb-dot" /><span className="label">{text}</span></div>;
}

export function MemoryMap({ onOpen }: { onOpen?: (name: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { clients } = useApp();
  const near = useInView(ref, { once: true, margin: "200px" });
  const mobile = useIsMobile();
  const reduced = useReduced();
  const names = [...clients.map((c) => c.name), "Inbox"];

  return (
    <div>
      <div ref={ref} className="scene" role="group" aria-label="3D map of Jarvis linked to each client and the inbox. Drag to spin.">
        {near ? (
          <Boundary fallback={<Poster text="3D view needs WebGL. Use the buttons below." />}>
            <Suspense fallback={<Poster text="Loading the map" />}>
              <Scene names={names} mobile={mobile} reduced={reduced} onOpen={(n) => (window.location.hash = n === "Inbox" ? href("inbox") : href("clients", n))} />
            </Suspense>
          </Boundary>
        ) : <Poster text="Memory map" />}
        <p className="scene-hint label">{mobile ? "Swipe sideways to spin. Tap a node." : "Drag to spin. Click a node."}</p>
      </div>
      <ul className="chips map-chips">
        {names.map((n) => (
          <li key={n}><a className="chip-link" href={n === "Inbox" ? href("inbox") : href("clients", n)} onClick={() => onOpen?.(n)}>{n}</a></li>
        ))}
      </ul>
    </div>
  );
}
