import { test } from "node:test";
import assert from "node:assert/strict";
import { attach, paradigm, type Paradigm } from "../src/lib/morph";

/** All forms of a section, row by row. */
const forms = (p: Paradigm | null, section = 0, table = 0) =>
  p![section].tables[table].rows.flatMap((r) => r.cells).join(" ");

test("attach aligns abbreviated endings", () => {
  assert.equal(attach("accipiō", "-cipere"), "accipere");
  assert.equal(attach("cōnsistō", "-sistere"), "cōnsistere");
  assert.equal(attach("aetās", "-tātis"), "aetātis");
});

test("nouns: all five declensions, i-stems, neuters, plural-only", () => {
  assert.equal(forms(paradigm("terra -ae f.", "noun")), "terra terrae terrae terrārum terrae terrīs terram terrās terrā terrīs");
  assert.equal(forms(paradigm("animus -ī m.", "noun")), "animus animī animī animōrum animō animīs animum animōs animō animīs anime animī");
  assert.equal(forms(paradigm("rēx rēgis m.", "noun")), "rēx rēgēs rēgis rēgum rēgī rēgibus rēgem rēgēs rēge rēgibus");
  assert.match(forms(paradigm("urbs urbis f.", "noun")), /urbium/);
  assert.match(forms(paradigm("hostis -is m./f.", "noun")), /hostium/);
  assert.equal(forms(paradigm("mare -is n.", "noun")), "mare maria maris marium marī maribus mare maria marī maribus");
  assert.equal(forms(paradigm("tempus -oris n.", "noun")), "tempus tempora temporis temporum temporī temporibus tempus tempora tempore temporibus");
  assert.equal(forms(paradigm("manus -ūs f.", "noun")), "manus manūs manūs manuum manuī manibus manum manūs manū manibus");
  assert.equal(forms(paradigm("diēs diēī m./f.", "noun")), "diēs diēs diēī diērum diēī diēbus diem diēs diē diēbus");
  assert.equal(forms(paradigm("arma -ōrum n. pl.", "noun")), "arma armōrum armīs arma armīs");
});

test("adjectives: 1st/2nd, pronominal, 3rd declension", () => {
  const bonus = paradigm("bonus -a -um", "adjective");
  assert.equal(forms(bonus).split(" ").slice(0, 3).join(" "), "bonus bona bonum");
  assert.match(forms(paradigm("ūnus -a -um", "adjective")), /ūnīus/);
  assert.match(forms(paradigm("omnis -e", "adjective"), 0, 1), /omnia omnium/);
  assert.match(forms(paradigm("ācer ācris ācre", "adjective")), /^ācer ācris ācre ācris/);
  assert.match(forms(paradigm("vetus veteris", "adjective"), 0, 1), /vetera veterum/);
});

test("verbs: regular conjugations and compounds", () => {
  const amo = paradigm("amō amāre amāvī amātum", "verb", "1st conjugation")!;
  assert.equal(forms(amo), "amō amāmus amās amātis amat amant");
  const capio = paradigm("accipiō -cipere -cēpī -ceptum", "verb", "3rd conjugation (-iō)")!;
  assert.equal(forms(capio, 0, 3), "accēpī accēpimus accēpistī accēpistis accēpit accēpērunt");
  assert.equal(forms(paradigm("quaerō -rere -sīvī -sītum", "verb"), 0, 3).split(" ")[0], "quaesīvī");
  assert.equal(forms(paradigm("teneō -ēre -uī tentum", "verb"), 0, 3).split(" ")[0], "tenuī");
  assert.equal(forms(paradigm("compōnō -pōnere posuī positum", "verb"), 0, 3).split(" ")[0], "composuī");
});

test("verbs: irregular, deponent", () => {
  assert.equal(forms(paradigm("sum esse fuī", "verb", "irregular")), "sum sumus es estis est sunt");
  assert.equal(forms(paradigm("ferō ferre tulī lātum", "verb", "irregular")), "ferō ferimus fers fertis fert ferunt");
  assert.equal(forms(paradigm("abeō -īre -iī -itum", "verb", "irregular"), 0, 3), "abiī abiimus abīstī abīstis abiit abiērunt");
  assert.equal(forms(paradigm("prōsum prodesse profuī", "verb", "irregular")), "prōsum prōsumus prōdes prōdestis prōdest prōsunt");
  const seq = paradigm("sequor sequī secūtus sum", "verb", "deponent")!;
  assert.equal(forms(seq), "sequor sequimur sequeris sequiminī sequitur sequuntur");
  assert.equal(forms(seq, 0, 3), "secūtus sum secūtī sumus secūtus es secūtī estis secūtus est secūtī sunt");
  assert.equal(forms(paradigm("dō dare dedī datum", "verb")), "dō damus dās datis dat dant");
});

test("unsupported shapes return null", () => {
  assert.equal(paradigm("nihil, nīl", "noun", "indeclinable"), null);
  assert.equal(paradigm("aiō", "verb", "irregular"), null);
});

test("compound boundaries after a vowel-initial infinitive; stems never align at the first letter", () => {
  assert.equal(forms(paradigm("exigō -igere -ēgī -āctum", "verb"), 0, 3).split(" ")[0], "exēgī");
  assert.match(forms(paradigm("imāgō -inis f.", "noun")), /imāginem/);
});

test("review fixes: 3rd-declension genitive splicing, semi-deponents, aliquis", () => {
  assert.match(forms(paradigm("virgō -inis f.", "noun")), /^virgō virginēs virginis/);
  assert.match(forms(paradigm("multitūdō -inis f.", "noun")), /multitūdinis/);
  assert.match(forms(paradigm("scelus -eris n.", "noun")), /sceleris/);
  assert.match(forms(paradigm("parēns -ntis m./f.", "noun")), /parentis/);
  assert.match(forms(paradigm("prīnceps -cipis", "adjective")), /prīncipis/);
  assert.match(forms(paradigm("sapiēns -ntis", "adjective")), /sapientis/);
  const audeo = paradigm("audeō audēre ausus sum", "verb", "2nd conjugation")!;
  assert.equal(forms(audeo, 0, 3), "ausus sum ausī sumus ausus es ausī estis ausus est ausī sunt");
  assert.ok(!audeo.some((s) => s.title === "indicativePassive"));
  assert.match(forms(paradigm("aliquis -quae -quod", "pronoun")), /^aliquis aliqua aliquid alicuius/);
});

test("drill: questions have one right word, a right parse, and no ambiguous distractor", async () => {
  const { cells, makeQuestion } = await import("../src/lib/drill");
  const word = (id: number, hw: string, pos: string, detail?: string) => ({
    id, hw, lemma: hw.split(" ")[0], plain: hw.split(" ")[0], rank: id, en: "", zh: "", zt: "", audio: [], group: null,
    pos: { en: pos, zh: "", zt: "" }, detail: detail ? { en: detail, zh: "", zt: "" } : null,
  });
  const pool = [
    word(1, "rēx rēgis m.", "noun"), word(2, "terra -ae f.", "noun"), word(3, "animus -ī m.", "noun"),
    word(4, "manus -ūs f.", "noun"), word(5, "amō amāre amāvī amātum", "verb", "1st conjugation"),
  ];
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 50; k++) {
    for (const w of pool) {
      const q = makeQuestion(w, pool, rnd)!;
      assert.ok(q.words.some((x) => x.id === w.id) && q.words.length === 4);
      const all = cells(paradigm(w.hw, w.pos.en, w.detail?.en)!);
      const fits = (p: string[]) => all.some((c) => c.form === q.form && c.parse.join() === p.join());
      assert.ok(fits(q.parses[q.answer]), `${q.form}: answer must fit`);
      q.parses.forEach((p, i) => i !== q.answer && assert.ok(!fits(p), `${q.form}: distractor ${p} also fits`));
    }
  }
});

test("drill: a choice of word never includes another word that also yields the form", async () => {
  const { makeQuestion } = await import("../src/lib/drill");
  const word = (id: number, hw: string, pos: string, detail?: string) => ({
    id, hw, lemma: hw.split(" ")[0], plain: hw.split(" ")[0], rank: id, en: "", zh: "", zt: "", audio: [], group: null,
    pos: { en: pos, zh: "", zt: "" }, detail: detail ? { en: detail, zh: "", zt: "" } : null,
  });
  const lex = word(1, "lēx lēgis f.", "noun");
  const lego = word(2, "legō legere lēgī lēctum", "verb", "3rd conjugation (-ō)");
  const pool = [lex, lego, word(3, "rēx rēgis m.", "noun"), word(4, "terra -ae f.", "noun"), word(5, "animus -ī m.", "noun"), word(6, "amō amāre amāvī amātum", "verb")];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 200; k++) {
    const q = makeQuestion(lex, pool, rnd);
    if (q && q.form === "lēgis") assert.ok(!q.words.some((w) => w.id === lego.id), "legō offered for lēgis");
  }
});
