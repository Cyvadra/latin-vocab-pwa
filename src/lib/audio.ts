"use client";
import { getSettings } from "./progress-store";
import { SPEECH_RATES, type Pronunciation, type Word } from "./types";

let el: HTMLAudioElement | null = null;

export { SPEECH_RATES };

/** The learner's playback speed (settings are validated on load/import, see parseProgress). */
function userRate(): number {
  const r = getSettings().speechRate;
  return (SPEECH_RATES as readonly number[]).includes(r) ? r : 1;
}

export function audioUrl(id: number, pron: Pronunciation): string {
  return `/audio/${pron}/${id}.mp3`;
}

export function sentenceAudioUrl(id: number, pron: Pronunciation): string {
  return `/audio/${pron}/s/${id}.mp3`;
}

// 0.05 s of silence. Playing it inside a tap unlocks the shared element for later programmatic play (iOS Safari).
const SILENCE =
  "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA";

/** Call from a user-gesture handler (e.g. the Start button). */
export function primeAudio() {
  try {
    el ??= new Audio();
    el.src = SILENCE;
    void el.play().catch(() => {});
  } catch {
    /* audio unavailable */
  }
}

export function stopAudio() {
  if (el) {
    el.pause();
    el.currentTime = 0;
  }
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

function speakFallback(text: string, pron: Pronunciation): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  const u = new SpeechSynthesisUtterance(text);
  // Few devices ship a Latin voice; Italian is a close match for ecclesiastical Latin.
  u.lang = pron === "ecclesiastical" ? "it-IT" : "la";
  u.rate = 0.85 * userRate();
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

async function play(url: string | null, text: string, pron: Pronunciation): Promise<boolean> {
  stopAudio();
  if (url) {
    try {
      el ??= new Audio();
      el.src = url;
      // set after src: some browsers reset playbackRate on load
      el.preservesPitch = true;
      el.playbackRate = el.defaultPlaybackRate = userRate();
      await el.play();
      return true;
    } catch {
      /* autoplay blocked or file missing: fall through */
    }
  }
  return speakFallback(text, pron);
}

/** Play a word's recording. Resolves true if a recording (or fallback voice) started. */
export function playWord(word: Word, pron: Pronunciation): Promise<boolean> {
  return play(word.audio.includes(pron) ? audioUrl(word.id, pron) : null, word.lemma, pron);
}

/** Play the word's example sentence. */
export function playSentence(word: Word, pron: Pronunciation): Promise<boolean> {
  if (!word.ex) return Promise.resolve(false);
  return play(word.ex.audio.includes(pron) ? sentenceAudioUrl(word.id, pron) : null, word.ex.la, pron);
}
