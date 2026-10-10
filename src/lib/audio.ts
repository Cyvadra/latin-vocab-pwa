"use client";
import type { Pronunciation, Word } from "./types";

let el: HTMLAudioElement | null = null;

export function audioUrl(id: number, pron: Pronunciation): string {
  return `/audio/${pron}/${id}.mp3`;
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

function speakFallback(word: Word, pron: Pronunciation): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  const u = new SpeechSynthesisUtterance(word.lemma);
  // Few devices ship a Latin voice; Italian is a close match for ecclesiastical Latin.
  u.lang = pron === "ecclesiastical" ? "it-IT" : "la";
  u.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

/** Play a word's recording. Resolves true if a recording (or fallback voice) started. */
export async function playWord(word: Word, pron: Pronunciation): Promise<boolean> {
  stopAudio();
  if (word.audio.includes(pron)) {
    try {
      el ??= new Audio();
      el.src = audioUrl(word.id, pron);
      await el.play();
      return true;
    } catch {
      /* autoplay blocked or file missing: fall through */
    }
  }
  return speakFallback(word, pron);
}
