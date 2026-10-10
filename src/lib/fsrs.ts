// Compact FSRS-4.5 scheduler (https://github.com/open-spaced-repetition/fsrs4anki).
import type { CardState } from "./types";

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461,
  2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365;
export const DAY_MS = 86_400_000;
/** Delay before a failed card reappears in the same session. */
export const RELEARN_DELAY_MS = 10 * 60_000;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clampD = (d: number) => clamp(d, 1, 10);

export function retrievability(elapsedDays: number, s: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
}

function intervalDays(s: number): number {
  const i = (s / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return clamp(Math.round(i), 1, MAX_INTERVAL_DAYS);
}

const initD = (g: Rating) => clampD(W[4] - W[5] * (g - 3));

export function newCard(id: number): CardState {
  return { id, phase: "new", due: 0, s: 0, d: 0, reps: 0, lapses: 0, last: 0 };
}

/** Return the card state after answering with the given rating at time `now`. */
export function schedule(card: CardState, rating: Rating, now: number): CardState {
  const next: CardState = { ...card, reps: card.reps + 1, last: now };

  if (card.phase === "new") {
    next.s = W[rating - 1];
    next.d = initD(rating);
  } else {
    const elapsed = Math.max(0, (now - card.last) / DAY_MS);
    const r = retrievability(elapsed, card.s);
    // Difficulty update with mean reversion toward the "Good" initial difficulty.
    const d1 = card.d - W[6] * (rating - 3);
    next.d = clampD(W[7] * initD(3) + (1 - W[7]) * d1);
    if (rating === 1) {
      next.lapses = card.lapses + 1;
      next.s = Math.min(
        card.s,
        W[11] * Math.pow(next.d, -W[12]) * (Math.pow(card.s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14])
      );
      next.s = Math.max(0.1, next.s);
    } else {
      const hard = rating === 2 ? W[15] : 1;
      const easy = rating === 4 ? W[16] : 1;
      next.s =
        card.s *
        (1 +
          Math.exp(W[8]) * (11 - card.d) * Math.pow(card.s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
    }
  }

  if (rating === 1) {
    next.phase = "learning";
    next.due = now + RELEARN_DELAY_MS;
  } else {
    next.phase = "review";
    next.due = now + intervalDays(next.s) * DAY_MS;
  }
  return next;
}

/** Preview of the interval each rating would give, in days (0 = same session). */
export function previewIntervals(card: CardState, now: number): Record<Rating, number> {
  const out = {} as Record<Rating, number>;
  for (const g of [1, 2, 3, 4] as Rating[]) {
    const n = schedule(card, g, now);
    out[g] = g === 1 ? 0 : Math.round((n.due - now) / DAY_MS);
  }
  return out;
}
