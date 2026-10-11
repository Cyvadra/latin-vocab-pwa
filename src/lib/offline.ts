import { audioUrl, chosenProns, sentenceAudioUrl, sourcesFor } from "./audio";
import type { AudioSource, Settings, Word } from "./types";

export const AUDIO_CACHE = "latin-audio-v3";

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
}
