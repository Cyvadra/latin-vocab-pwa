"use client";
import { useSyncExternalStore } from "react";
import { newCard, schedule, type Rating } from "./fsrs";
import { DEFAULT_SETTINGS, SPEECH_RATES, type CardState, type DayLog, type Progress, type Settings } from "./types";

import { addDays, dayKey } from "./progress-store-pure";
export { addDays, dayKey };

const KEY = "latin.progress.v1";

const listeners = new Set<() => void>();
let state: Progress | null = null;
let loaded = false;

const emptyProgress = (): Progress => ({
  version: 1,
  cards: {},
  log: {},
  settings: { ...DEFAULT_SETTINGS },
  updatedAt: 0,
});

/** Imported/stored settings may come from older versions or hand-edited files. */
function sanitizeSettings(s: Settings): Settings {
  const rate = (SPEECH_RATES as readonly number[]).includes(s.speechRate) ? s.speechRate : DEFAULT_SETTINGS.speechRate;
  const pron = (["classical", "ecclesiastical", "both"] as const).includes(s.pron) ? s.pron : DEFAULT_SETTINGS.pron;
  const classicalVoice = s.classicalVoice === "phonetic" ? "phonetic" : "neural";
  return { ...s, speechRate: rate, pron, classicalVoice };
}

/** Validate and normalise untrusted data (from storage or an imported file). */
export function parseProgress(raw: unknown): Progress | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Progress>;
  if (r.version !== 1 || typeof r.cards !== "object" || !r.cards) return null;
  const cards: Record<number, CardState> = {};
  for (const [k, c] of Object.entries(r.cards)) {
    const id = Number(k);
    if (!Number.isInteger(id) || !c || typeof c !== "object") continue;
    const cs = c as CardState;
    if (![cs.due, cs.s, cs.d, cs.reps, cs.lapses, cs.last].every((n) => typeof n === "number" && isFinite(n))) continue;
    if (!["new", "learning", "review"].includes(cs.phase)) continue;
    cards[id] = { ...cs, id };
  }
  const log: Record<string, DayLog> = {};
  for (const [k, v] of Object.entries(r.log ?? {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === "object") {
      const l = v as DayLog;
      log[k] = { reviews: l.reviews | 0, newCards: l.newCards | 0, correct: l.correct | 0 };
    }
  }
  return {
    version: 1,
    cards,
    log,
    settings: sanitizeSettings({
      ...DEFAULT_SETTINGS,
      // settings saved before the pronunciation choice existed always showed both recordings; keep that
      ...(r.settings && !("pron" in r.settings) ? { pron: "both" as const } : {}),
      ...(r.settings ?? {}),
    }),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

function load(): Progress {
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const p = parseProgress(JSON.parse(text));
      if (p) return p;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return emptyProgress();
}

function commit(next: Progress) {
  state = { ...next, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: keep in memory only */
  }
  listeners.forEach((l) => l());
}

function current(): Progress {
  if (!loaded) {
    loaded = true;
    state = load();
  }
  return state!;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current settings outside React (defaults during SSR). */
export function getSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : current().settings;
}

/** Returns null during SSR/hydration, then the stored progress. */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, current, () => null);
}

export function reviewCard(id: number, rating: Rating, now = Date.now()): CardState {
  const p = current();
  const prev = p.cards[id] ?? newCard(id);
  const next = schedule(prev, rating, now);
  const key = dayKey(now);
  const day = p.log[key] ?? { reviews: 0, newCards: 0, correct: 0 };
  const updatedDay: DayLog = {
    reviews: day.reviews + 1,
    newCards: day.newCards + (prev.phase === "new" ? 1 : 0),
    correct: day.correct + (rating > 1 ? 1 : 0),
  };
  commit({ ...p, cards: { ...p.cards, [id]: next }, log: { ...p.log, [key]: updatedDay } });
  return next;
}

export function updateSettings(patch: Partial<Settings>) {
  const p = current();
  commit({ ...p, settings: { ...p.settings, ...patch } });
}

export function exportProgress(): string {
  return JSON.stringify(current(), null, 1);
}

/** Replace local progress with an exported file. Returns an error code or null. */
export function importProgress(text: string): "not-json" | "invalid" | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "not-json";
  }
  const p = parseProgress(parsed);
  if (!p) return "invalid";
  commit(p);
  return null;
}

export function resetProgress() {
  const p = current();
  commit({ ...emptyProgress(), settings: p.settings });
}

export function currentStreak(log: Record<string, DayLog>, now = Date.now()): number {
  let streak = 0;
  let t = now;
  // Today not yet studied does not break the streak.
  if (!(log[dayKey(t)]?.reviews > 0)) t = addDays(t, -1);
  while (log[dayKey(t)]?.reviews > 0) {
    streak++;
    t = addDays(t, -1);
  }
  return streak;
}
