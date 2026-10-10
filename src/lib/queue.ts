import { addDays, dayKey } from "./progress-store-pure";
import type { Progress, Word } from "./types";

export interface Queue {
  /** Word ids to study, due reviews first, then new words. */
  ids: number[];
  dueCount: number;
  newCount: number;
}

function endOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Build today's study queue. `extraNew` lets the learner pull in more new words. */
export function buildQueue(words: Word[], p: Progress, now: number, extraNew = 0): Queue {
  const due = Object.values(p.cards)
    .filter((c) => c.phase !== "new" && c.due <= endOfToday(now))
    .sort((a, b) => a.due - b.due)
    .map((c) => c.id);
  const introduced = p.log[dayKey(now)]?.newCards ?? 0;
  const budget = Math.max(0, p.settings.newPerDay - introduced) + extraNew;
  const fresh: number[] = [];
  for (const w of words) {
    if (fresh.length >= budget) break;
    if (!p.cards[w.id] || p.cards[w.id].phase === "new") fresh.push(w.id);
  }
  return { ids: [...due, ...fresh], dueCount: due.length, newCount: fresh.length };
}

export { addDays };
