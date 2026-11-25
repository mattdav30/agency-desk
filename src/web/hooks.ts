import { useEffect, useState } from "react";

export const routes = ["overview", "clients", "ad-spend", "reports", "inbox"] as const;
export type RouteName = (typeof routes)[number];
export const routeLabels: Record<RouteName, string> = {
  overview: "Overview", clients: "Clients", "ad-spend": "Ad spend", reports: "Reports", inbox: "Inbox",
};

export type Route = { name: RouteName; param?: string };

function parse(): Route {
  const [, name, param] = window.location.hash.replace(/^#/, "").split("/");
  const found = routes.find((r) => r === name);
  return { name: found ?? "overview", param: param ? decodeURIComponent(param) : undefined };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const href = (name: RouteName, param?: string) =>
  `#/${name}${param ? "/" + encodeURIComponent(param) : ""}`;

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

export const useIsMobile = () => useMedia("(max-width: 700px), (pointer: coarse)");
export const useReduced = () => useMedia("(prefers-reduced-motion: reduce)");
