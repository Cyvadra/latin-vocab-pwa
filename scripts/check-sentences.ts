// Validates data/sentences/*.tsv: format, and that each sentence contains a form of its word.
// Also reports tokens that aren't a known form of any core word (proper names, rare words).
// Usage: tsx scripts/check-sentences.ts [file…]   (exit code 1 on errors)
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { allForms, plainLatin, wordMatcher } from "../src/lib/morph";
import { DETAIL, POS } from "./labels";

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "data", "sentences");

interface Row { id: number; headword: string; pos: string; pos_detail: string | null }
const db = new Database(path.join(root, "data", "latin.db"), { readonly: true });
const words = db.prepare("SELECT id, headword, pos, pos_detail FROM words").all() as Row[];

const labels = (w: Row) => [POS[w.pos]?.en ?? "", w.pos_detail ? DETAIL[w.pos_detail]?.en : undefined] as const;
const matchers = new Map(words.map((w) => [w.id, wordMatcher(w.headword, ...labels(w))]));

// every plain form of every core word, to report tokens outside the vocabulary
const known = new Set(words.flatMap((w) => allForms(w.headword, ...labels(w)).map(plainLatin)));
const ENCLITICS = /(que|ne|ue|cum)$/;
const tokensOf = (la: string) => la.split(/[^\p{L}]+/u).filter(Boolean).map(plainLatin);
const matches = (tok: string, set: Set<string>) =>
  set.has(tok) || (ENCLITICS.test(tok) && set.has(tok.replace(ENCLITICS, "")));

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(dir).filter((f) => f.endsWith(".tsv")).sort().map((f) => path.join(dir, f));

let errors = 0;
let total = 0;
const unknown = new Map<string, number>();
const seen = new Set<number>();
for (const file of files) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim() || line.startsWith("#")) return;
    const where = `${path.basename(file)}:${i + 1}`;
    const cols = line.split("\t");
    const fail = (msg: string) => (errors++, console.log(`ERROR ${where} ${msg}`));
    if (cols.length < 4 || cols.length > 5) return fail(`expected 4–5 tab-separated columns, got ${cols.length}`);
    const [idS, la, en, zh] = cols;
    const id = Number(idS);
    if (!matchers.has(id)) return fail(`unknown word id ${idS}`);
    if (seen.has(id)) fail(`duplicate sentence for word ${id}`);
    seen.add(id);
    if (!la.trim() || !en.trim() || !zh.trim()) return fail("empty field");
    if (la.length > 140) fail(`sentence too long (${la.length} chars)`);
    total++;
    const toks = tokensOf(la);
    if (!toks.some(matchers.get(id)!)) {
      fail(`no form of "${words.find((w) => w.id === id)!.headword}" found in: ${la}`);
    }
    for (const t of toks) if (!matches(t, known)) unknown.set(t, (unknown.get(t) ?? 0) + 1);
  });
}
const unk = [...unknown].sort((a, b) => b[1] - a[1]);
console.log(`${total} sentences, ${errors} errors, ${unk.length} distinct tokens outside the core list`);
if (process.env.VERBOSE) console.log(unk.map(([t, n]) => `${t}×${n}`).join(" "));
process.exit(errors ? 1 : 0);
