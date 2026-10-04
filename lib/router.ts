"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sheetHistory } from "./sheet-history";
import { parseHash, type Route } from "./parse-hash";

export { parseHash };
export type { Route };

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

const routeKey = (route: Route) => route.view + ("id" in route ? `:${route.id}` : "");

let claimedKey: string | null = null;

/**
 * A view that sets its own scroll position on mount (e.g. restoring the Days list)
 * calls this from a layout effect so useRoute skips its scroll-to-top for that route.
 */
export function claimScroll(route: Route): void {
  claimedKey = routeKey(route);
}

// Server/hydration snapshot is "" (default route), so no hydration mismatch;
// React re-renders with the real hash right after hydration.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const route = parseHash(hash);
  const key = routeKey(route);
  useEffect(() => {
    const claimed = claimedKey === key;
    claimedKey = null;
    if (!claimed) window.scrollTo(0, 0);
  }, [key]);
  return route;
}

// Sheet-aware: callers may close a sheet and navigate in any order.
// replace: swap the current entry so Back skips it (prev/next day).
export function navigate(path: string, opts?: { replace?: boolean }): void {
  sheetHistory.navigate(path.startsWith("#") ? path : `#${path}`, opts);
}

// Back only when the previous entry is in-app; deep-link landing falls back to home.
export function goBack(): void {
  if (sheetHistory.canGoBack()) history.back();
  else navigate("/");
}
