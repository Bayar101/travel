"use client";

import BottomNav from "./BottomNav";
import CategoriesView from "./views/CategoriesView";
import DayDetailView from "./views/DayDetailView";
import DaysView from "./views/DaysView";
import LocationDetailView from "./views/LocationDetailView";
import LocationsView from "./views/LocationsView";
import StaysView from "./views/StaysView";
import OfflineBadge from "./OfflineBadge";
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
  }
}

export default function App() {
  const { data, online, loading, error } = useTrip();
  const route = useRoute();

  return (
    <ToastProvider>
      <div className="mx-auto min-h-dvh max-w-md pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {!online && <OfflineBadge />}
        {data ? <View route={route} /> : showLoadError({ data, loading, error, online }) ? <LoadError online={online} /> : <Skeleton />}
      </div>
      <BottomNav route={route} />
    </ToastProvider>
  );
}
