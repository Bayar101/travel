"use client";

import BottomNav from "./BottomNav";
import Header from "./Header";
import OfflineBadge from "./OfflineBadge";
import { ToastProvider } from "./Toast";
import { useRoute, type Route } from "@/lib/router";
import { useTrip } from "@/lib/store";

function Placeholder({ title, back }: { title: string; back?: boolean }) {
  return (
    <>
      <Header title={title} back={back} />
      <p className="p-4 text-zinc-400">Coming soon</p>
    </>
  );
}

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

// View switch: Tasks 7-9 replace the placeholders below.
function View({ route }: { route: Route }) {
  switch (route.view) {
    case "days":
      return <Placeholder title="Days" />;
    case "day":
      return <Placeholder title="Day" back />;
    case "locations":
      return <Placeholder title="Locations" />;
    case "location":
      return <Placeholder title="Location" back />;
    case "categories":
      return <Placeholder title="Categories" back />;
    case "stays":
      return <Placeholder title="Stays" />;
  }
}

export default function App() {
  const { data, online } = useTrip();
  const route = useRoute();

  return (
    <ToastProvider>
      <div className="mx-auto min-h-dvh max-w-md pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {data ? <View route={route} /> : <Skeleton />}
      </div>
      {!online && <OfflineBadge />}
      <BottomNav route={route} />
    </ToastProvider>
  );
}
