"use client";

import { useEffect, useRef } from "react";
import BottomNav from "./BottomNav";
import CategoriesView from "./views/CategoriesView";
import DayDetailView from "./views/DayDetailView";
import DaysView from "./views/DaysView";
import LocationDetailView from "./views/LocationDetailView";
import LocationsView from "./views/LocationsView";
import MapView, { warmMapOnIdle } from "./views/MapView";
import StaysView from "./views/StaysView";
import OfflineBadge from "./OfflineBadge";
import RegisterSW from "./RegisterSW";
import { ToastProvider } from "./Toast";
import { useRoute, type Route } from "@/lib/router";
import { showLoadError } from "@/lib/sync-logic";
import { sync, useTrip } from "@/lib/store";

function Skeleton() {
  return (
    <div aria-busy="true" className="space-y-3 p-4">
      <div className="h-8 w-1/2 animate-pulse rounded-lg bg-zinc-900" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />
      ))}
    </div>
  );
}

function LoadError({ online }: { online: boolean }) {
  return (
    <div className="space-y-4 p-6 text-center">
      <p className="text-zinc-100">
        {online ? "Couldn't load your trip." : "You're offline and nothing is saved on this device yet."}
      </p>
      <button
        type="button"
        onClick={() => void sync({ force: true })}
        className="min-h-11 rounded-xl bg-red-500 px-6 text-base font-medium text-white active:bg-red-600"
      >
        Retry
      </button>
    </div>
  );
}

function View({ route }: { route: Route }) {
  switch (route.view) {
    case "days":
      return <DaysView />;
    case "day":
      return <DayDetailView id={route.id} />;
    case "locations":
      return <LocationsView />;
    case "location":
      return <LocationDetailView id={route.id} />;
    case "categories":
      return <CategoriesView />;
    case "stays":
      return <StaysView />;
    case "map":
      return <MapView />;
  }
}

export default function App() {
  const { data, online, loading, error } = useTrip();
  const route = useRoute();
  useEffect(() => {
    if (online) warmMapOnIdle();
  }, [online]);
  // Freshness: cheap conditional fetch on every navigation (gate throttles to 30 s).
  // Only on actual changes: startup does its own forced sync after reading the cache.
  const routeKey = route.view + ("id" in route ? `:${route.id}` : "");
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;
    void sync();
  }, [routeKey]);

  return (
    <ToastProvider>
      <RegisterSW />
      <div className="mx-auto min-h-dvh max-w-md pb-[calc(var(--nav-h)+0.5rem)]">
        {!online && route.view !== "map" && <OfflineBadge />}
        {data ? <View route={route} /> : showLoadError({ data, loading, error, online }) ? <LoadError online={online} /> : <Skeleton />}
      </div>
      <BottomNav route={route} />
    </ToastProvider>
  );
}
