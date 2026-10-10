export type Lang = "en" | "zh";
/** Chinese script: simplified (hans) or traditional (hant). */
export type Script = "hans" | "hant";
export type GlossMode = "en" | "zh" | "both";
export type Pronunciation = "classical" | "ecclesiastical";

export interface Label {
  en: string;
  zh: string;
  /** Traditional Chinese */
  zt: string;
}

export interface Example {
  /** Latin sentence, with macrons */
  la: string;
  en: string;
  zh: string;
  /** Traditional Chinese translation */
  zt: string;
  /** Citation for a genuine quotation; null for constructed sentences */
  src: string | null;
  /** Pronunciation systems with a recording of the sentence */
  audio: Pronunciation[];
}

export interface Word {
  id: number;
  /** Full dictionary entry, e.g. "abeō -īre -iī -itum" */
  hw: string;
  /** First form, e.g. "abeō" */
  lemma: string;
  /** Macron-free lemma for search */
  plain: string;
  /** Frequency rank (1 = most common) */
  rank: number;
  pos: Label;
  detail: Label | null;
  group: Label | null;
  en: string;
  zh: string;
  /** Traditional Chinese gloss */
  zt: string;
  /** Pronunciation systems with an audio file available */
  audio: Pronunciation[];
  /** Example sentence */
  ex?: Example;
  /** Descendants: English words, and the Italian/Spanish/French word */
  der?: { en?: string[]; it?: string; es?: string; fr?: string };
}

export type CardPhase = "new" | "learning" | "review";

export interface CardState {
  id: number;
  phase: CardPhase;
  /** Due time, ms since epoch */
  due: number;
  /** FSRS stability in days */
  s: number;
  /** FSRS difficulty, 1..10 */
  d: number;
  reps: number;
  lapses: number;
  /** Last review time, ms since epoch */
  last: number;
}

export interface DayLog {
  reviews: number;
  newCards: number;
  correct: number;
}

export type CardFront = "latin" | "listen" | "meaning" | "mixed";

export interface Settings {
  uiLang: Lang;
  script: Script;
  gloss: GlossMode;
  newPerDay: number;
  autoplay: boolean;
  front: CardFront;
  theme: "system" | "light" | "dark";
  /** Playback speed multiplier for recordings and the fallback voice; one of SPEECH_RATES. */
  speechRate: number;
}

export interface Progress {
  version: 1;
  cards: Record<number, CardState>;
  log: Record<string, DayLog>;
  settings: Settings;
  updatedAt: number;
}

export const SPEECH_RATES = [0.6, 0.75, 0.9, 1, 1.15, 1.3] as const;

export const DEFAULT_SETTINGS: Settings = {
  uiLang: "en",
  script: "hans",
  gloss: "en",
  newPerDay: 10,
  autoplay: true,
  front: "latin",
  theme: "system",
  speechRate: 1,
};
