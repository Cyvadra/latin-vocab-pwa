"use client";
import { useEffect, useState } from "react";
import { wordSlugs } from "./slug";
import type { Word } from "./types";

interface WordData {
  words: Word[];
  byId: Map<number, Word>;
  /** id → URL slug (see slug.ts) */
  slugs: Map<number, string>;
}

let cache: Promise<WordData> | null = null;

export function loadWords(): Promise<WordData> {
  if (!cache) {
    cache = fetch("/data/words.json")
      .then((r) => {
        if (!r.ok) throw new Error(`words.json: ${r.status}`);
        return r.json();
      })
      .then((j: { words: Word[] }) => ({
        words: j.words,
        byId: new Map(j.words.map((w) => [w.id, w])),
        slugs: wordSlugs(j.words),
      }))
      .catch((e) => {
        cache = null; // allow retry
        throw e;
      });
  }
  return cache;
}

export function useWords(): { data: WordData | null; error: boolean } {
  const [data, setData] = useState<WordData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadWords().then(
      (d) => alive && setData(d),
      () => alive && setError(true)
    );
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}
