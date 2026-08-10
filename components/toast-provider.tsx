"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<((message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(next: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(next);
    timeoutRef.current = setTimeout(() => setMessage(null), 1800);
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-foreground px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-background shadow-lg"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
