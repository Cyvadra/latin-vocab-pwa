// Exports the SQLite vocabulary into public/data/words.json for the offline-capable client.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DETAIL, GROUP, POS, type Label } from "./labels";
import { toHant } from "./zh-convert";

const root = path.resolve(__dirname, "..");
const db = new Database(path.join(root, "data", "latin.db"), { readonly: true });

const lookup = (map: Record<string, Label>, key: string | null, what: string) => {
  if (!key) return null;
  const v = map[key];
  if (!v) throw new Error(`No label for ${what} "${key}"`);
  return { ...v, zt: toHant(v.zh) };
};

interface WordRow {
  id: number; headword: string; lemma: string; lemma_plain: string;
  pos: string; pos_detail: string | null; semantic: string | null; freq_rank: number;
}

const glossStmt = db.prepare("SELECT lang, text FROM glosses WHERE word_id = ?");
const derStmt = db.prepare("SELECT en, it, es, fr FROM derivatives WHERE word_id = ?");
const sentenceStmt = db.prepare("SELECT la, en, zh, source FROM sentences WHERE word_id = ?");
const sentenceAudioStmt = db.prepare("SELECT system FROM sentence_audio WHERE word_id = ?");
const audioStmt = db.prepare("SELECT system FROM audio WHERE word_id = ?");

const words = (db.prepare("SELECT * FROM words ORDER BY freq_rank, id").all() as WordRow[]).map((w) => {
  const glosses = Object.fromEntries(
    (glossStmt.all(w.id) as { lang: string; text: string }[]).map((g) => [g.lang, g.text])
  );
  const s = sentenceStmt.get(w.id) as { la: string; en: string; zh: string; source: string | null } | undefined;
  const ex = s && {
    la: s.la,
    en: s.en,
    zh: s.zh,
    zt: toHant(s.zh),
    src: s.source,
    audio: (sentenceAudioStmt.all(w.id) as { system: string }[]).map((a) => a.system),
  };
  const d = derStmt.get(w.id) as { en: string | null; it: string | null; es: string | null; fr: string | null } | undefined;
  const der = d && {
    ...(d.en ? { en: d.en.split(/,\s*/) } : {}),
    ...(d.it ? { it: d.it } : {}),
    ...(d.es ? { es: d.es } : {}),
    ...(d.fr ? { fr: d.fr } : {}),
  };
  const audio = (audioStmt.all(w.id) as { system: string }[]).map((a) => a.system);
  return {
    id: w.id,
    hw: w.headword,
    lemma: w.lemma,
    plain: w.lemma_plain,
    rank: w.freq_rank,
    pos: lookup(POS, w.pos, "pos"),
    detail: lookup(DETAIL, w.pos_detail, "detail"),
    group: lookup(GROUP, w.semantic, "group"),
    en: glosses.en,
    zh: glosses.zh,
    zt: toHant(glosses.zh),
    audio,
    ...(ex ? { ex } : {}),
    ...(der ? { der } : {}),
  };
});

const outDir = path.join(root, "public", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "words.json"), JSON.stringify({ v: Date.now(), words }));
console.log(`Wrote ${words.length} words`);
