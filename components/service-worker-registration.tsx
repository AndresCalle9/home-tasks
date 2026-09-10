"use client";

import { useEffect } from "react";

// Registers public/sw.js after mount, off the critical rendering path —
// installability is a nice-to-have, never something worth delaying or
// failing the page over.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
