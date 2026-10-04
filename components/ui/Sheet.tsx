"use client";

import { useEffect, useRef } from "react";
import { sheetHistory } from "@/lib/sheet-history";
import { useVisualViewport } from "./useVisualViewport";
import { XIcon } from "./icons";

export default function Sheet({
  open,
  title,
  onClose,
  footer,
  autoFocus = false,
  alert = false,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  autoFocus?: boolean; // opt-in: focusing an input pops the mobile keyboard
  alert?: boolean;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handle = sheetHistory.open(() => closeRef.current());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && handle.isTop()) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const el = panel.current;
    if (autoFocus) {
      el?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
      )?.focus();
    }
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      handle.release();
    };
  }, [open, autoFocus]);

  const vp = useVisualViewport(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={panel}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={vp ? { bottom: vp.bottom, maxHeight: vp.maxHeight } : undefined}
        className="pb-safe absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 text-zinc-100 outline-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 pl-4 pr-2">
          <h2 className="min-w-0 flex-1 truncate py-3 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800"
          >
            <XIcon size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="sticky bottom-0 shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">{footer}</div>}
      </div>
    </div>
  );
}
