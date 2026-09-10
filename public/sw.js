// Minimal service worker: exists only to satisfy Chrome/Android's PWA
// installability requirement (a registered SW with a fetch handler).
// Intentionally does NOT cache anything or intercept requests — no
// offline support by design; every fetch just falls through to the
// network as if this file didn't exist.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op.
});
