"use client";

import { useEffect, useSyncExternalStore } from "react";
import { parseHash, type Route } from "./parse-hash";

export { parseHash };
export type { Route };

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

// Server/hydration snapshot is "" (default route), so no hydration mismatch;
// React re-renders with the real hash right after hydration.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const route = parseHash(hash);
  const key = route.view + ("id" in route ? `:${route.id}` : "");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
  return route;
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith("#") ? path : `#${path}`;
}
