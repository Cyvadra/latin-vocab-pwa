// Form-recognition drill: show an inflected form, ask for its dictionary word and its grammatical description.
import { paradigm, plainLatin, type Paradigm } from "./morph";
import type { StringKey } from "./strings";
import type { Progress, Word } from "./types";

export interface Cell {
  form: string;
  /** Labels describing the slot, most general first: [mood/voice?, tense or number?, row, column?] */
  parse: StringKey[];
}

export interface Question {
  word: Word;
  form: string;
  /** Four candidate words (one is `word`), shuffled */
  words: Word[];
  /** Four candidate descriptions; the correct one is at index `answer` */
  parses: StringKey[][];
  answer: number;
}

const parseKey = (p: StringKey[]) => p.join("|");

/** Flatten a paradigm into single-word forms with their descriptions. */
export function cells(par: Paradigm): Cell[] {
  const out: Cell[] = [];
  for (const s of par) {
    for (const t of s.tables) {
      for (const r of t.rows) {
        r.cells.forEach((c, i) => {
          const form = c.split("/")[0].trim();
          // periphrastic forms ("amātus sum") and gaps can't be told apart from their parts
          if (!form || form === "—" || form.includes(" ")) return;
          const parse: StringKey[] = [];
          if (s.title !== "declension") parse.push(s.title);
          if (t.title) parse.push(t.title);
          parse.push(r.label);
          if (t.cols[i]) parse.push(t.cols[i]);
          out.push({ form, parse });
        });
      }
    }
  }
  return out;
}

const shuffle = <T>(xs: T[], rnd: () => number): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const DRILLABLE = new Set(["noun", "verb", "adjective", "pronoun"]);

// Paradigms are pure functions of the word; build each one once per session, not once per round.
const paradigms = new WeakMap<Word, Paradigm | null>();
const paradigmOf = (w: Word): Paradigm | null => {
  if (!paradigms.has(w)) paradigms.set(w, DRILLABLE.has(w.pos.en) ? paradigm(w.hw, w.pos.en, w.detail?.en) : null);
  return paradigms.get(w)!;
};
const formSets = new WeakMap<Word, Set<string>>();
const formsOf = (w: Word): Set<string> => {
  if (!formSets.has(w)) {
    const par = paradigmOf(w);
    formSets.set(w, new Set([plainLatin(w.lemma), ...(par ? cells(par).map((c) => plainLatin(c.form)) : [])]));
  }
  return formSets.get(w)!;
};

/**
 * Words to drill: those already studied, or (beginner) the most frequent inflected words.
 * `beginner` tells the UI which of the two it got.
 */
export function drillPool(words: Word[], progress: Progress): { pool: Word[]; beginner: boolean } {
  const inflected = words.filter((w) => paradigmOf(w));
  const studied = inflected.filter((w) => progress.cards[w.id] && progress.cards[w.id].phase !== "new");
  if (studied.length >= 8) return { pool: studied, beginner: false };
  return { pool: [...inflected].sort((a, b) => a.rank - b.rank).slice(0, 60), beginner: true };
}

/** Build one question, or null if the word offers nothing to ask. `rnd` is a [0,1) random source. */
export function makeQuestion(word: Word, pool: Word[], rnd: () => number = Math.random): Question | null {
  const par = paradigmOf(word);
  if (!par) return null;
  const all = cells(par);
  // prefer forms that differ from the dictionary form, so the learner has to recognise an ending
  const lemma = plainLatin(word.lemma);
  const candidates = all.filter((c) => plainLatin(c.form) !== lemma);
  if (!candidates.length) return null;
  const target = candidates[Math.floor(rnd() * candidates.length)];
  const same = plainLatin(target.form);
  // every slot this exact form fills is a right answer (e.g. dat./abl. plural); distractors come from the others
  const correct = new Set(all.filter((c) => plainLatin(c.form) === same).map((c) => parseKey(c.parse)));
  const seen = new Set(correct);
  const distractors: StringKey[][] = [];
  for (const c of shuffle(all, rnd)) {
    const k = parseKey(c.parse);
    if (seen.has(k)) continue;
    seen.add(k);
    distractors.push(c.parse);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const parses = shuffle([target.parse, ...distractors], rnd);

  // other words of the same part of speech make the lemma choice non-trivial;
  // a word that can also produce this form (lēx/legō: legis) would be a second right answer, so skip it
  const usable = pool.filter((w) => w.id !== word.id && !formsOf(w).has(same));
  const others = shuffle(usable.filter((w) => w.pos.en === word.pos.en), rnd).slice(0, 3);
  if (others.length < 3) others.push(...shuffle(usable.filter((w) => !others.includes(w)), rnd).slice(0, 3 - others.length));
  if (others.length < 3) return null;
  return {
    word,
    form: target.form,
    words: shuffle([word, ...others], rnd),
    parses,
    answer: parses.indexOf(target.parse),
  };
}

/** A session of `n` questions from distinct words of the pool. */
export function makeSession(pool: Word[], n: number, rnd: () => number = Math.random): Question[] {
  const out: Question[] = [];
  for (const w of shuffle(pool, rnd)) {
    const q = makeQuestion(w, pool, rnd);
    if (q) out.push(q);
    if (out.length === n) break;
  }
  return out;
}
