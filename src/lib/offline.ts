import { audioUrl } from "./audio";
import type { Pronunciation, Word } from "./types";

export const AUDIO_CACHE = "latin-audio-v1";

/** Fetch every recording for one pronunciation into the Cache Storage used by the service worker. */
export async function downloadAudio(
  words: Word[],
  pron: Pronunciation,
  onProgress: (fraction: number) => void
): Promise<void> {
  if (!("caches" in globalThis)) throw new Error("Cache Storage unavailable");
  const cache = await caches.open(AUDIO_CACHE);
  const urls = words.filter((w) => w.audio.includes(pron)).map((w) => audioUrl(w.id, pron));
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
