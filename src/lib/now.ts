"use client";
import { useSyncExternalStore } from "react";

// A client-only clock. Reading Date.now() during render is impure (and breaks prerendering), so
// components read it through an external store that refreshes when the app returns to the
// foreground or periodically, keeping long-lived PWA sessions from showing yesterday's queue.
let cached = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function refresh() {
  cached = Date.now();
  listeners.forEach((l) => l());
}

function onVisible() {
  if (document.visibilityState === "visible") refresh();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisible);
    timer = setInterval(refresh, 5 * 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    }
  };
}

const getSnapshot = () => (cached ||= Date.now());

/** Current time in ms, or null during SSR/prerender. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
