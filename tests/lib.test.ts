import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_MS, newCard, schedule } from "../src/lib/fsrs";
import { buildQueue } from "../src/lib/queue";
import { addDays, dayKey } from "../src/lib/progress-store-pure";
import { DEFAULT_SETTINGS, type Progress, type Word } from "../src/lib/types";

const T0 = new Date(2026, 9, 10, 12, 0, 0).getTime();

const word = (id: number, rank: number): Word => ({
  id, hw: `w${id}`, lemma: `w${id}`, plain: `w${id}`, rank,
  pos: { en: "noun", zh: "名词", zt: "名詞" }, detail: null, group: null, en: "x", zh: "x", zt: "x", audio: [],
});
const progress = (over: Partial<Progress> = {}): Progress => ({
  version: 1, cards: {}, log: {}, settings: { ...DEFAULT_SETTINGS, newPerDay: 3 }, updatedAt: 0, ...over,
});

test("good on a new card graduates with a multi-day interval", () => {
  const c = schedule(newCard(1), 3, T0);
  assert.equal(c.phase, "review");
  assert.ok(c.due - T0 >= 3 * DAY_MS && c.due - T0 <= 4 * DAY_MS, `due in ${(c.due - T0) / DAY_MS}d`);
});

test("again keeps card in learning with a short delay and counts a lapse on reviews", () => {
  const first = schedule(newCard(1), 3, T0);
  const failed = schedule(first, 1, first.due);
  assert.equal(failed.phase, "learning");
  assert.equal(failed.lapses, 1);
  assert.ok(failed.due - first.due < DAY_MS);
  assert.ok(failed.s < first.s);
});

test("intervals grow with successful reviews and easy > good > hard", () => {
  const base = schedule(newCard(1), 3, T0);
  const now = base.due;
  const [hard, good, easy] = [2, 3, 4].map((g) => schedule(base, g as 2 | 3 | 4, now).due - now);
  assert.ok(hard < good && good < easy);
  assert.ok(good > base.due - T0);
});

test("queue: due cards first, new words limited by daily budget and rank order", () => {
  const words = [1, 2, 3, 4, 5, 6].map((i) => word(i, i));
  const due = { ...newCard(5), phase: "review" as const, due: T0 - DAY_MS, s: 2, d: 5, reps: 1, last: T0 - 3 * DAY_MS };
  const later = { ...due, id: 6, due: addDays(T0, 5) };
  const p = progress({ cards: { 5: due, 6: later } });
  const q = buildQueue(words, p, T0);
  assert.deepEqual(q.ids, [5, 1, 2, 3]);
  assert.equal(q.dueCount, 1);
  assert.equal(q.newCount, 3);
});

test("queue: new words already introduced today reduce the budget", () => {
  const words = [1, 2, 3, 4].map((i) => word(i, i));
  const p = progress({ log: { [dayKey(T0)]: { reviews: 2, newCards: 2, correct: 2 } } });
  assert.equal(buildQueue(words, p, T0).newCount, 1);
  assert.equal(buildQueue(words, p, T0, 5).newCount, 4);
});

test("addDays is calendar based", () => {
  const d = new Date(addDays(new Date(2026, 2, 7, 12).getTime(), 1));
  assert.equal(d.getDate(), 8);
  assert.equal(d.getHours(), 12);
});
