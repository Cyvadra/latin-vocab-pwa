/**
 * Word URLs use the lemma (`/words/quī`). Homographs are numbered in frequency order
 * (`eō`, `eō-2`); the old numeric ids (`/words/271`) still resolve.
 */
export interface SlugWord {
  id: number;
  lemma: string;
  rank: number;
}

const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function wordSlugs(words: SlugWord[]): Map<number, string> {
  const seen = new Map<string, number>();
  const out = new Map<number, string>();
  for (const w of [...words].sort((a, b) => a.rank - b.rank || a.id - b.id)) {
    const n = (seen.get(w.lemma) ?? 0) + 1;
    seen.set(w.lemma, n);
    out.set(w.id, n === 1 ? w.lemma : `${w.lemma}-${n}`);
  }
  return out;
}

/** The word id a URL segment names, or null. Also accepts the lemma typed without macrons. */
export function resolveSlug(param: string, slugs: Map<number, string>): number | null {
  let s = param;
  try {
    s = decodeURIComponent(param);
  } catch {}
  s = s.normalize("NFC");
  if (/^\d+$/.test(s)) return slugs.has(Number(s)) ? Number(s) : null;
  let loose: number | null = null;
  for (const [id, slug] of slugs) {
    if (slug === s) return id;
    if (loose === null && plain(slug) === plain(s)) loose = id;
  }
  return loose;
}

export const wordHref = (slugs: Map<number, string>, id: number) => `/words/${encodeURIComponent(slugs.get(id) ?? String(id))}`;
