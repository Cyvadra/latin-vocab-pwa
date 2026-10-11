import { test } from "node:test";
import assert from "node:assert/strict";
import { cells } from "../src/lib/drill";
import { paradigm, plainLatin } from "../src/lib/morph";

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
