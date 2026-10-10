import Database from "better-sqlite3";
import path from "node:path";

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

export function listWordIds(): number[] {
  return (open().prepare("SELECT id FROM words ORDER BY id").all() as { id: number }[]).map((r) => r.id);
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
