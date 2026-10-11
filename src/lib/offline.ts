import { audioUrl, chosenProns, pickSource, sentenceAudioUrl } from "./audio";
import type { AudioSource, Settings, Word } from "./types";

export const AUDIO_CACHE = "latin-audio-v3";

// What the last complete download covered, so Settings can tell when it no longer matches playback.
const DOWNLOADED_KEY = "latin-audio-downloaded";
const downloadTag = (s: Pick<Settings, "pron" | "classicalVoice">) => `${AUDIO_CACHE}|${s.pron}|${s.classicalVoice}`;

// Left in the audio cache by sw.js when it drops a large older audio cache (downloads made before the tag existed).
const LEGACY_MARKER = "/__audio-legacy-download";

/** Whether an audio download from an older cache version was discarded (and never redone). */
export async function hadLegacyDownload(): Promise<boolean> {
  if (!("caches" in globalThis)) return false;
  try {
    return !!(await (await caches.open(AUDIO_CACHE)).match(LEGACY_MARKER));
  } catch {
    return false;
  }
}

/**
 * Whether downloaded audio covers these settings: "none" (never downloaded), "current", or "stale"
 * (a different cache version, or a pronunciation/voice playback now needs that wasn't fetched).
 */
export function offlineAudioState(settings: Pick<Settings, "pron" | "classicalVoice">): "none" | "current" | "stale" {
  let tag: string | null = null;
  try {
    tag = localStorage.getItem(DOWNLOADED_KEY);
  } catch {
    /* storage unavailable */
  }
  if (!tag) return "none";
  const [cache, pron, voice] = tag.split("|");
  if (cache !== AUDIO_CACHE) return "stale";
  const covered = pron === "both" ? ["classical", "ecclesiastical"] : [pron];
  const needed = chosenProns(settings);
  if (!needed.every((p) => covered.includes(p))) return "stale";
  if (needed.includes("classical") && voice !== settings.classicalVoice) return "stale";
  return "current";
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
    chosenProns(settings).flatMap((p) => pickSource(available, p, settings) ?? []);
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
  await cache.delete(LEGACY_MARKER);
  try {
    localStorage.setItem(DOWNLOADED_KEY, downloadTag(settings));
  } catch {
    /* storage unavailable */
  }
}
