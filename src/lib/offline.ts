import { audioUrl, chosenProns, sentenceAudioUrl, sourcesFor } from "./audio";
import type { AudioSource, Settings, Word } from "./types";

export const AUDIO_CACHE = "latin-audio-v3";

// What the last complete download covered, so Settings can tell when it no longer matches playback.
const DOWNLOADED_KEY = "latin-audio-downloaded";
const downloadTag = (s: Pick<Settings, "pron" | "classicalVoice">) => `${AUDIO_CACHE}|${s.pron}|${s.classicalVoice}`;

/** Whether downloaded audio matches these settings: "none" (never downloaded), "current", or "stale". */
export function offlineAudioState(settings: Pick<Settings, "pron" | "classicalVoice">): "none" | "current" | "stale" {
  let tag: string | null = null;
  try {
    tag = localStorage.getItem(DOWNLOADED_KEY);
  } catch {
    /* storage unavailable */
  }
  if (!tag) return "none";
  return tag === downloadTag(settings) ? "current" : "stale";
}

/**
 * Fetch the recordings the learner listens to (words and example sentences, in the chosen
 * pronunciation and classical voice) into the Cache Storage used by the service worker.
 * Inflected-form recordings are left out (~32,000 files); they are cached as they are played.
 */
export async function downloadAudio(
  words: Word[],
  settings: Pick<Settings, "pron" | "classicalVoice">,
  onProgress: (fraction: number) => void
): Promise<void> {
  if (!("caches" in globalThis)) throw new Error("Cache Storage unavailable");
  const cache = await caches.open(AUDIO_CACHE);
  // the first available source per chosen pronunciation, as playback would pick it
  const first = (available: AudioSource[]) =>
    chosenProns(settings).flatMap((p) => sourcesFor(p, settings).find((s) => available.includes(s)) ?? []);
  const urls = words.flatMap((w) => [
    ...first(w.audio).map((src) => audioUrl(w.id, src)),
    ...first(w.ex?.audio ?? []).map((src) => sentenceAudioUrl(w.id, src)),
  ]);
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        await cache.put(url, res);
      }
      onProgress(++done / urls.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  try {
    localStorage.setItem(DOWNLOADED_KEY, downloadTag(settings));
  } catch {
    /* storage unavailable */
  }
}
