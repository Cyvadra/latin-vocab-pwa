// Every distinct single-word inflected form, most frequent words first -> data/forms.tsv (key, form).
// The TTS scripts voice this list with --forms; periphrastic cells ("amātus sum") reuse their parts.
import fs from "node:fs";
import path from "node:path";
import { formKey, paradigm } from "../src/lib/morph";
import type { Word } from "../src/lib/types";

const root = path.resolve(__dirname, "..");
// built by data:build, which has the English part-of-speech labels the engine expects
const data = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "words.json"), "utf8"));
const words = [...(data.words ?? data)].sort((a, b) => a.rank - b.rank) as Word[];

const seen = new Map<string, string>();
for (const w of words) {
  for (const s of paradigm(w.hw, w.pos.en, w.detail?.en) ?? []) {
    for (const t of s.tables) {
      for (const r of t.rows) {
        for (const cell of r.cells) {
          for (const f of cell.split("/").map((x) => x.trim())) {
            if (!f || f === "—" || f.includes(" ")) continue;
            const k = formKey(f);
            const prev = seen.get(k);
            if (prev && prev !== f) throw new Error(`key clash: ${prev} / ${f}`);
            seen.set(k, f);
          }
        }
      }
    }
  }
}
fs.writeFileSync(path.join(root, "data", "forms.tsv"), [...seen].map(([k, f]) => `${k}\t${f}`).join("\n") + "\n");
console.log(`Wrote ${seen.size} forms -> data/forms.tsv`);
