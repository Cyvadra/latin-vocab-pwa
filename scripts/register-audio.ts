// Record every public/audio/<system>/<id>.mp3 in the SQLite `audio` table.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const ENGINES: Record<string, string> = {
  classical: "Ken-Z/latin_SpeechT5 (VITS, Vox Classica)",
  ecclesiastical: "Piper it_IT-serena-medium via Latin→Italian respelling",
};

const db = new Database(path.join(root, "data", "latin.db"));
const ids = new Set((db.prepare("SELECT id FROM words").all() as { id: number }[]).map((r) => r.id));
const insert = db.prepare("INSERT OR REPLACE INTO audio (word_id, system, engine, path) VALUES (?,?,?,?)");

db.exec("DELETE FROM audio");
let count = 0;
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
  }
})();
console.log(`Registered ${count} audio files`);
