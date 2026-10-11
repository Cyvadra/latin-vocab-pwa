// Record every public/audio/<system>/<id>.mp3 in the SQLite `audio` table.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const ENGINES: Record<string, string> = {
  classical: "Ken-Z/latin_SpeechT5 (VITS, Vox Classica)",
  ecclesiastical: "Piper it_IT-serena-medium via Latin→Italian respelling",
  "classical-alt": "Piper it_IT-paola-medium reading rule-based classical IPA (tts/latin_ipa.py)",
};

const db = new Database(path.join(root, "data", "latin.db"));
const ids = new Set((db.prepare("SELECT id FROM words").all() as { id: number }[]).map((r) => r.id));
const sentenceIds = new Set((db.prepare("SELECT word_id FROM sentences").all() as { word_id: number }[]).map((r) => r.word_id));
const insertSentence = db.prepare("INSERT OR REPLACE INTO sentence_audio (word_id, system, engine, path) VALUES (?,?,?,?)");
const insert = db.prepare("INSERT OR REPLACE INTO audio (word_id, system, engine, path) VALUES (?,?,?,?)");

db.exec("DELETE FROM audio; DELETE FROM sentence_audio");
let count = 0;
let sentenceCount = 0;
db.transaction(() => {
  for (const [system, engine] of Object.entries(ENGINES)) {
    const dir = path.join(root, "public", "audio", system);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = /^(\d+)\.mp3$/.exec(f);
      if (!m || !ids.has(Number(m[1]))) continue;
      insert.run(Number(m[1]), system, engine, `${system}/${f}`);
      count++;
    }
    // example sentences: public/audio/<system>/s/<wordId>.mp3
    const sDir = path.join(dir, "s");
    if (!fs.existsSync(sDir)) continue;
    for (const f of fs.readdirSync(sDir)) {
      const m = /^(\d+)\.mp3$/.exec(f);
      if (!m || !sentenceIds.has(Number(m[1]))) continue;
      insertSentence.run(Number(m[1]), system, engine, `${system}/s/${f}`);
      sentenceCount++;
    }
  }
})();
console.log(`Registered ${count} word and ${sentenceCount} sentence audio files`);
