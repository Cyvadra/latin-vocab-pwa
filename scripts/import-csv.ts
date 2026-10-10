import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const csvPath = path.join(root, "data", "latin-core-list.csv");
const dbPath = path.join(root, "data", "latin.db");

// Minimal RFC-4180 parser (quoted fields, embedded commas/newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const stripMacrons = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");

// Lemma = first token of the headword ("ā ab abs" -> "ā"); full form kept in headword.
const lemmaOf = (headword: string) =>
  headword.split(/\s+/)[0].split("/")[0].replace(/[()]/g, "").replace(/[-,;:]+$/, "");

const enDir = path.join(root, "data", "en");
const en = new Map<number, string>();
for (const f of fs.readdirSync(enDir).filter((f) => f.endsWith(".tsv")).sort()) {
  for (const line of fs.readFileSync(path.join(enDir, f), "utf8").split("\n")) {
    const [id, text] = line.split("\t");
    if (id && text) en.set(Number(id), text.trim());
  }
}

const csv = fs.readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const [, ...rows] = parseCsv(csv);

fs.rmSync(dbPath, { force: true });
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE words (
    id          INTEGER PRIMARY KEY,
    headword    TEXT NOT NULL,         -- full dictionary entry, with macrons
    lemma       TEXT NOT NULL,         -- first form, used for TTS/display
    lemma_plain TEXT NOT NULL,         -- macron-free, for search
    pos         TEXT NOT NULL,         -- part of speech (main category)
    pos_detail  TEXT,                  -- e.g. 第三变位法，以-ō结尾
    semantic    TEXT,
    freq_rank   INTEGER NOT NULL
  );
  CREATE TABLE glosses (
    word_id INTEGER NOT NULL REFERENCES words(id),
    lang    TEXT NOT NULL,             -- 'zh', later 'en'
    text    TEXT NOT NULL,
    PRIMARY KEY (word_id, lang)
  );
  CREATE TABLE audio (
    word_id INTEGER NOT NULL REFERENCES words(id),
    system  TEXT NOT NULL,             -- 'classical' | 'ecclesiastical'
    engine  TEXT NOT NULL,
    path    TEXT NOT NULL,             -- relative to public/audio
    PRIMARY KEY (word_id, system)
  );
  CREATE TABLE sentences (
    word_id INTEGER PRIMARY KEY REFERENCES words(id),
    la      TEXT NOT NULL,             -- Latin, with macrons
    en      TEXT NOT NULL,
    zh      TEXT NOT NULL,
    source  TEXT                       -- citation for genuine quotations; NULL if constructed
  );
  CREATE TABLE sentence_audio (
    word_id INTEGER NOT NULL REFERENCES sentences(word_id),
    system  TEXT NOT NULL,
    engine  TEXT NOT NULL,
    path    TEXT NOT NULL,             -- relative to public/audio
    PRIMARY KEY (word_id, system)
  );
  CREATE TABLE derivatives (
    word_id INTEGER PRIMARY KEY REFERENCES words(id),
    en      TEXT,                      -- comma-separated English derivatives
    it      TEXT,                      -- Italian / Spanish / French descendant
    es      TEXT,
    fr      TEXT
  );
  CREATE INDEX idx_words_rank ON words(freq_rank);
  CREATE INDEX idx_words_plain ON words(lemma_plain);
`);

const insWord = db.prepare(
  "INSERT INTO words (headword, lemma, lemma_plain, pos, pos_detail, semantic, freq_rank) VALUES (?,?,?,?,?,?,?)"
);
const insGloss = db.prepare("INSERT INTO glosses (word_id, lang, text) VALUES (?,?,?)");

db.transaction(() => {
  for (const [headword, gloss, posFull, semantic, rank] of rows) {
    if (!headword?.trim() || !rank?.trim()) continue; // blank filler rows
    const cleanHead = headword.trim().replace(/:$/, "");
    const [pos, ...rest] = posFull.split("：");
    const lemma = lemmaOf(cleanHead);
    const { lastInsertRowid } = insWord.run(
      cleanHead, lemma, stripMacrons(lemma), pos.trim(),
      rest.join("：").trim() || null, semantic.trim() || null, Number(rank)
    );
    insGloss.run(lastInsertRowid, "zh", gloss.trim().replace(/[，,]$/, ""));
    const e = en.get(Number(lastInsertRowid));
    if (!e) throw new Error(`missing English gloss for word ${lastInsertRowid} ${cleanHead}`);
    insGloss.run(lastInsertRowid, "en", e);
  }
})();

// Example sentences: data/sentences/*.tsv = word_id, Latin, English, Chinese, source (see scripts/check-sentences.ts)
const sentDir = path.join(root, "data", "sentences");
const insSentence = db.prepare("INSERT INTO sentences (word_id, la, en, zh, source) VALUES (?,?,?,?,?)");
let sentences = 0;
const wordIds = new Set((db.prepare("SELECT id FROM words").all() as { id: number }[]).map((r) => r.id));
const done = new Set<number>();
db.transaction(() => {
  if (!fs.existsSync(sentDir)) return;
  for (const f of fs.readdirSync(sentDir).filter((f) => f.endsWith(".tsv")).sort()) {
    for (const line of fs.readFileSync(path.join(sentDir, f), "utf8").split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const [id, la, en, zh, source] = line.split("\t").map((c) => c?.trim());
      // malformed rows are skipped (run scripts/check-sentences.ts for details) rather than failing the build
      const bad = !wordIds.has(Number(id)) ? "unknown word id" : !la || !en || !zh ? "empty field" : done.has(Number(id)) ? "duplicate" : null;
      if (bad) {
        console.warn(`skipping ${f}: ${bad}: ${line.slice(0, 60)}`);
        continue;
      }
      done.add(Number(id));
      insSentence.run(Number(id), la, en, zh, source || null);
      sentences++;
    }
  }
})();

// Derivatives: data/derivatives/*.tsv = word_id, English (comma-separated), Italian, Spanish, French
const derDir = path.join(root, "data", "derivatives");
const insDerivative = db.prepare("INSERT INTO derivatives (word_id, en, it, es, fr) VALUES (?,?,?,?,?)");
let derivatives = 0;
const derDone = new Set<number>();
db.transaction(() => {
  if (!fs.existsSync(derDir)) return;
  for (const f of fs.readdirSync(derDir).filter((f) => f.endsWith(".tsv")).sort()) {
    for (const line of fs.readFileSync(path.join(derDir, f), "utf8").split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const [id, en, it, es, fr] = line.split("\t").map((c) => c?.trim() || null);
      const bad = !wordIds.has(Number(id)) ? "unknown word id" : derDone.has(Number(id)) ? "duplicate" : null;
      if (bad) {
        console.warn(`skipping ${f}: ${bad}: ${line.slice(0, 60)}`);
        continue;
      }
      derDone.add(Number(id));
      if (en || it || es || fr) {
        insDerivative.run(Number(id), en, it, es, fr);
        derivatives++;
      }
    }
  }
})();

const n = (db.prepare("SELECT COUNT(*) c FROM words").get() as { c: number }).c;
console.log(`Imported ${n} words, ${sentences} sentences, ${derivatives} derivative rows -> ${dbPath}`);
