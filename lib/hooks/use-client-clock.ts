import { useSyncExternalStore } from "react";
import { getTodayIndex } from "@/lib/days";

// The server doesn't know the visitor's local date/time, so both values
// resolve to null on the server snapshot and fill in once hydrated client-
// side — avoids a server/client mismatch (see components/bottom-nav.tsx's
// sibling pattern in the old calendar-accordion for the same trick).
function subscribeToNothing() {
  return () => {};
}

function getServerSnapshot() {
  return null;
}

export function useTodayIndex(): number | null {
  return useSyncExternalStore(subscribeToNothing, getTodayIndex, getServerSnapshot);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function useGreeting(): string | null {
  return useSyncExternalStore(subscribeToNothing, getGreeting, getServerSnapshot);
}
