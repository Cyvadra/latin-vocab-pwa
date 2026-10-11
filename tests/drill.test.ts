import { test } from "node:test";
import assert from "node:assert/strict";
import { cells } from "../src/lib/drill";
import { paradigm, plainLatin } from "../src/lib/morph";
import type { Word } from "../src/lib/types";

// A form that is the second alternative of another slot ("dī/deī") still fills that slot.
for (const [hw, detail, form] of [
  ["deus -ī m.; dea -ae f.", "2nd declension", "deī"],
  ["domus -ūs f.", "4th declension", "domō"],
] as const) {
  test(`every slot ${form} fills is found (${hw})`, () => {
    const all = cells(paradigm(hw, "noun", detail)!);
    const slots = all.filter((c) => c.alts.some((a) => plainLatin(a) === plainLatin(form)));
    assert.ok(slots.length >= 2, `${form}: ${slots.map((c) => c.parse.join(" ")).join("; ")}`);
  });
}

// Options show only the lemma: two that read alike (mundus noun/adjective, līber/liber) would be ambiguous.
test("word options never share a lemma", async () => {
  const { readFileSync } = await import("node:fs");
  const { makeSession } = await import("../src/lib/drill");
  const { words } = JSON.parse(readFileSync("public/data/words.json", "utf8")) as { words: Word[] };
  const count = new Map<string, number>();
  for (const w of words) count.set(plainLatin(w.lemma), (count.get(plainLatin(w.lemma)) ?? 0) + 1);
  // a pool made of look-alike lemmas, so a duplicate option would be likely
  const pool = words.filter((w) => count.get(plainLatin(w.lemma))! > 1);
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 20; k++) {
    for (const q of makeSession(pool, 50, rnd)) {
      const lemmas = q.words.map((w) => plainLatin(w.lemma));
      assert.equal(new Set(lemmas).size, lemmas.length, lemmas.join(", "));
    }
  }
});
