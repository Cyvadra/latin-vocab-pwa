import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as store from "../src/lib/progress-store";
import { addDays, dayKey } from "../src/lib/progress-store-pure";

// Minimal localStorage shim (the store only touches it lazily, at call time).
const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});


beforeEach(() => store.resetProgress());

test("review updates card, daily log and counts new cards once", () => {
  const now = new Date(2026, 9, 10, 9, 0).getTime();
  store.reviewCard(5, 3, now);
  store.reviewCard(5, 1, now + 1000);
  const p = JSON.parse(store.exportProgress());
  assert.equal(p.cards[5].reps, 2);
  assert.equal(p.cards[5].phase, "learning");
  assert.deepEqual(p.log[dayKey(now)], { reviews: 2, newCards: 1, correct: 1 });
});

test("export then import round-trips", () => {
  store.reviewCard(7, 4);
  store.updateSettings({ autoplay: false, newPerDay: 15 });
  const text = store.exportProgress();
  store.resetProgress();
  assert.equal(store.importProgress(text), null);
  const p = JSON.parse(store.exportProgress());
  assert.ok(p.cards[7]);
  assert.equal(p.settings.autoplay, false);
  assert.equal(p.settings.newPerDay, 15);
});

test("import rejects garbage and keeps current data", () => {
  store.reviewCard(9, 3);
  assert.equal(store.importProgress("not json"), "not-json");
  assert.equal(store.importProgress('{"version":2}'), "invalid");
  assert.equal(store.importProgress("[]"), "invalid");
  assert.ok(JSON.parse(store.exportProgress()).cards[9]);
});

test("import drops malformed cards and fills missing settings", () => {
  const text = JSON.stringify({
    version: 1,
    cards: {
      "1": { id: 1, phase: "review", due: 1, s: 2, d: 3, reps: 1, lapses: 0, last: 1 },
      "2": { id: 2, phase: "bogus", due: 1, s: 2, d: 3, reps: 1, lapses: 0, last: 1 },
      "x": { id: 3 },
      "4": { id: 4, phase: "review", due: "soon", s: 2, d: 3, reps: 1, lapses: 0, last: 1 },
    },
    log: { "2026-10-10": { reviews: 3, newCards: 1, correct: 2 }, "garbage": { reviews: 9 } },
    settings: { newPerDay: 20 },
  });
  assert.equal(store.importProgress(text), null);
  const p = JSON.parse(store.exportProgress());
  assert.deepEqual(Object.keys(p.cards), ["1"]);
  assert.deepEqual(Object.keys(p.log), ["2026-10-10"]);
  assert.equal(p.settings.newPerDay, 20);
  assert.equal(p.settings.uiLang, "en");
  assert.equal(p.settings.autoplay, true);
});

test("streak counts consecutive days and tolerates a not-yet-studied today", () => {
  const now = new Date(2026, 9, 10, 8, 0).getTime();
  const day = (n: number) => dayKey(addDays(now, n));
  const log = {
    [day(-1)]: { reviews: 5, newCards: 0, correct: 5 },
    [day(-2)]: { reviews: 2, newCards: 0, correct: 2 },
    [day(-4)]: { reviews: 2, newCards: 0, correct: 2 },
  };
  assert.equal(store.currentStreak(log, now), 2);
  log[day(0)] = { reviews: 1, newCards: 0, correct: 1 };
  assert.equal(store.currentStreak(log, now), 3);
  assert.equal(store.currentStreak({}, now), 0);
});

test("reset keeps settings", () => {
  store.updateSettings({ uiLang: "zh" });
  store.reviewCard(3, 3);
  store.resetProgress();
  const p = JSON.parse(store.exportProgress());
  assert.deepEqual(p.cards, {});
  assert.equal(p.settings.uiLang, "zh");
});
