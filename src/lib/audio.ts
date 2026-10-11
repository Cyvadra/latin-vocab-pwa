"use client";
import { getSettings } from "./progress-store";
import { formKey } from "./morph";
import { SPEECH_RATES, type AudioSource, type Pronunciation, type Settings, type Word } from "./types";

let el: HTMLAudioElement | null = null;

export { SPEECH_RATES };

/** The learner's playback speed (settings are validated on load/import, see parseProgress). */
function userRate(): number {
  const r = getSettings().speechRate;
  return (SPEECH_RATES as readonly number[]).includes(r) ? r : 1;
}

export function audioUrl(id: number, src: AudioSource): string {
  return `/audio/${src}/${id}.mp3`;
}

export function sentenceAudioUrl(id: number, src: AudioSource): string {
  return `/audio/${src}/s/${id}.mp3`;
}

export function formAudioUrl(form: string, src: AudioSource): string {
  return `/audio/${src}/f/${formKey(form)}.mp3`;
}

/** Audio sources for a pronunciation, preferred first: the chosen classical engine, then the other one. */
export function sourcesFor(pron: Pronunciation, settings: Pick<Settings, "classicalVoice"> = getSettings()): AudioSource[] {
  if (pron === "ecclesiastical") return ["ecclesiastical"];
  return settings.classicalVoice === "phonetic" ? ["classical-alt", "classical"] : ["classical", "classical-alt"];
}

/** The pronunciations the learner chose to hear, in display order. */
export function chosenProns(settings: Pick<Settings, "pron"> = getSettings()): Pronunciation[] {
  return settings.pron === "both" ? ["classical", "ecclesiastical"] : [settings.pron];
}

const pick = (available: AudioSource[], pron: Pronunciation) => sourcesFor(pron).find((s) => available.includes(s)) ?? null;

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

async function play(urls: (string | null)[], text: string, pron: Pronunciation): Promise<boolean> {
  stopAudio();
  for (const url of urls) {
    if (!url) continue;
    try {
      el ??= new Audio();
      el.src = url;
      // set after src: some browsers reset playbackRate on load
      el.preservesPitch = true;
      el.playbackRate = el.defaultPlaybackRate = userRate();
      await el.play();
      return true;
    } catch {
      /* autoplay blocked or file missing: try the next source */
    }
  }
  return speakFallback(text, pron);
}

/** Play a word's recording. Resolves true if a recording (or fallback voice) started. */
export function playWord(word: Word, pron: Pronunciation): Promise<boolean> {
  const src = pick(word.audio, pron);
  return play([src && audioUrl(word.id, src)], word.lemma, pron);
}

/** Play the word's example sentence. */
export function playSentence(word: Word, pron: Pronunciation): Promise<boolean> {
  if (!word.ex) return Promise.resolve(false);
  const src = pick(word.ex.audio, pron);
  return play([src && sentenceAudioUrl(word.id, src)], word.ex.la, pron);
}

/**
 * Play one inflected form. Form recordings aren't listed in words.json (there are ~32,000),
 * so try each source in turn and fall back to the device voice.
 */
export function playForm(form: string, pron: Pronunciation): Promise<boolean> {
  return play(sourcesFor(pron).map((s) => formAudioUrl(form, s)), form, pron);
}
