import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./icons";
import { AppProvider } from "./ctx";
import { ChatPanel, JarvisBar } from "./Jarvis";
import { href, routeLabels, routes, useRoute } from "./hooks";
import { Overview } from "./pages/Overview";
import { Clients } from "./pages/Clients";
import { InboxPage, ReportsPage } from "./pages/OtherPages";
import { AdSpendPage } from "./pages/AdSpend";

function Shell() {
  const route = useRoute();
  useEffect(() => { document.title = `${routeLabels[route.name]} · Agency Desk`; }, [route.name]);
  const key = route.name + (route.param ?? "");

  return (
    <div className="app">
      <motion.header className="top" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <a className="brand" href={href("overview")} aria-label="Agency Desk home"><Icon name="logo" size={26} /><span>Agency Desk</span></a>
        <nav className="nav" aria-label="Main">
          {routes.map((r) => (
            <a key={r} href={href(r)} className={route.name === r ? "pill active" : "pill"} aria-current={route.name === r ? "page" : undefined}>
              {route.name === r && <motion.span layoutId="nav-active" className="nav-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="nav-text">{routeLabels[r]}</span>
            </a>
          ))}
        </nav>
        <JarvisBar />
      </motion.header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div key={key} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(6px)" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            {route.name === "overview" && <Overview />}
            {route.name === "clients" && <Clients selected={route.param} />}
            {route.name === "ad-spend" && <AdSpendPage />}
            {route.name === "reports" && <ReportsPage />}
            {route.name === "inbox" && <InboxPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ChatPanel />
    </div>
  );
}

export function App() {
  return <AppProvider><Shell /></AppProvider>;
}
