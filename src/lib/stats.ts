import { addDays, dayKey } from "./progress-store-pure";
import type { Progress } from "./types";

export interface Stats {
  learned: number;
  mature: number;
  last7: { key: string; reviews: number }[];
  accuracy7: number | null;
}

export function computeStats(p: Progress, now: number): Stats {
  let learned = 0;
  let mature = 0;
  for (const c of Object.values(p.cards)) {
    if (c.phase === "new") continue;
    learned++;
    if (c.phase === "review" && c.s >= 21) mature++;
  }
  const last7: Stats["last7"] = [];
  let reviews = 0;
  let correct = 0;
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(addDays(now, -i));
    const l = p.log[key];
    last7.push({ key, reviews: l?.reviews ?? 0 });
    reviews += l?.reviews ?? 0;
    correct += l?.correct ?? 0;
  }
  return { learned, mature, last7, accuracy7: reviews ? Math.round((correct / reviews) * 100) : null };
}
