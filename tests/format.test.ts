import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHeadword } from "../src/lib/format";

const cases: [string, string][] = [
  ["abeō -īre -iī -itum", "abeō, -īre, -iī, -itum"],
  ["aciēs -ēī f.", "aciēs, -ēī f."],
  ["arma -ōrum n. pl.", "arma, -ōrum n. pl."],
  ["ā ab abs", "ā, ab, abs"],
  ["canis -is m./f.", "canis, -is m./f."],
  ["deus -ī m.; dea -ae f.", "deus, -ī m.; dea, -ae f."],
  ["adversus (-um)", "adversus (-um)"],
  ["ne (enclitic)", "ne (enclitic)"],
  ["vulgus -ī n. and m.", "vulgus, -ī n. and m."],
  ["et", "et"],
];
for (const [input, expected] of cases) {
  test(`formatHeadword(${input})`, () => assert.equal(formatHeadword(input), expected));
}
