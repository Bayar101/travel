"use client";

import { useEffect, useState } from "react";

export interface ViewportBox { bottom: number; maxHeight: number }

// Tracks the visual viewport (shrinks when the on-screen keyboard opens) so
// bottom-anchored sheets stay above the keyboard.
export function useVisualViewport(active: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () =>
      setBox({
        bottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
        maxHeight: vv.height * 0.9,
      });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? box : null;
}
