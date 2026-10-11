import Database from "better-sqlite3";
import path from "node:path";
import { wordSlugs, type SlugWord } from "./slug";

let db: Database.Database | null = null;

function open(): Database.Database {
  db ??= new Database(path.join(process.cwd(), "data", "latin.db"), { readonly: true, fileMustExist: true });
  return db;
}

export interface WordMeta {
  id: number;
  lemma: string;
  en: string;
}

// The database is read-only, so build the slug map once rather than once per word page.
let slugs: Map<number, string> | null = null;

export function listWordSlugs(): Map<number, string> {
  slugs ??= wordSlugs(open().prepare("SELECT id, lemma, freq_rank AS rank FROM words").all() as SlugWord[]);
  return slugs;
}

export function getWordMeta(id: number): WordMeta | null {
  const row = open()
    .prepare(
      `SELECT w.id, w.lemma, g.text AS en FROM words w
       JOIN glosses g ON g.word_id = w.id AND g.lang = 'en' WHERE w.id = ?`
    )
    .get(id) as WordMeta | undefined;
  return row ?? null;
}
