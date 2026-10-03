"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastKind = "success" | "error";
interface ToastState { id: number; msg: string; kind: ToastKind }
interface ToastApi { show: (msg: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(0);

  const show = useCallback((msg: string, kind: ToastKind = "success") => {
    clearTimeout(timer.current);
    setToast({ id: nextId.current++, msg, kind });
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className={`rounded-xl px-4 py-3 text-base shadow-lg ${
              toast.kind === "error" ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-950"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
