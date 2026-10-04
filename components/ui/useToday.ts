"use client";

import { useEffect, useState } from "react";
import { todayISO } from "@/lib/selectors";
import { msUntilNextDay } from "@/lib/stay-dates";

/**
 * Local "YYYY-MM-DD" that stays current: re-reads at local midnight and whenever the app
 * comes back (focus / visibilitychange), since timers don't fire while a PWA is suspended.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setToday(todayISO()); // same string → no re-render
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextDay(new Date()) + 1000);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return today;
}
