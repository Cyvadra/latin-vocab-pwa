import { test } from "node:test";
import assert from "node:assert/strict";
import { attach, isInvariable, paradigm, type Paradigm } from "../src/lib/morph";

/** All forms of a section, row by row. */
const forms = (p: Paradigm | null, section = 0, table = 0) =>
  p![section].tables[table].rows.flatMap((r) => r.cells).join(" ");

test("attach aligns abbreviated endings", () => {
  assert.equal(attach("accipiō", "-cipere"), "accipere");
  assert.equal(attach("cōnsistō", "-sistere"), "cōnsistere");
  assert.equal(attach("aetās", "-tātis"), "aetātis");
});

test("nouns: all five declensions, i-stems, neuters, plural-only", () => {
  assert.equal(forms(paradigm("terra -ae f.", "noun")), "terra terrae terrae terrārum terrae terrīs terram terrās terrā terrīs terra terrae");
  assert.equal(forms(paradigm("animus -ī m.", "noun")), "animus animī animī animōrum animō animīs animum animōs animō animīs anime animī");
  assert.equal(forms(paradigm("rēx rēgis m.", "noun")), "rēx rēgēs rēgis rēgum rēgī rēgibus rēgem rēgēs rēge rēgibus rēx rēgēs");
  assert.match(forms(paradigm("urbs urbis f.", "noun")), /urbium/);
  assert.match(forms(paradigm("hostis -is m./f.", "noun")), /hostium/);
  assert.equal(forms(paradigm("mare -is n.", "noun")), "mare maria maris marium marī maribus mare maria marī maribus mare maria");
  assert.equal(forms(paradigm("tempus -oris n.", "noun")), "tempus tempora temporis temporum temporī temporibus tempus tempora tempore temporibus tempus tempora");
  assert.equal(forms(paradigm("manus -ūs f.", "noun")), "manus manūs manūs manuum manuī manibus manum manūs manū manibus manus manūs");
  assert.equal(forms(paradigm("diēs diēī m./f.", "noun")), "diēs diēs diēī diērum diēī diēbus diem diēs diē diēbus diēs diēs");
  assert.equal(forms(paradigm("arma -ōrum n. pl.", "noun")), "arma armōrum armīs arma armīs arma");
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

test("indeclinables return null; defective and impersonal verbs get partial tables", () => {
  assert.equal(paradigm("nefās", "noun", "indeclinable"), null);
  assert.equal(paradigm("decem", "adjective", "numeral"), null);
  assert.match(forms(paradigm("aiō", "verb", "irregular")), /^aiō — ais — ait aiunt/);
  const licet = paradigm("licet licēre licuit licitum est", "verb", "impersonal")!;
  assert.equal(forms(licet), "licet licēbat licēbit licuit/licitum est licuerat/licitum erat licuerit/licitum erit");
  assert.equal(forms(paradigm("oportet -ēre -uit", "verb", "impersonal"), 1), "oporteat oportēret oportuerit oportuisset");
  assert.match(forms(paradigm("quīcumque quaecumque quodcumque", "pronoun"), 0, 1), /^quīcumque quaecumque quaecumque quōrumcumque/);
});

const section = (p: Paradigm | null, title: string) => p!.find((s) => s.title === title)!;
const cellsOf = (p: Paradigm | null, title: string) => section(p, title).tables.flatMap((t) => t.rows.flatMap((r) => r.cells)).join(" ");

test("two-lemma nouns decline both", () => {
  const dea = paradigm("deus -ī m.; dea -ae f.", "noun")!;
  assert.equal(dea[0].tables.length, 2);
  assert.match(forms(dea, 0, 1), /deābus/);
  assert.match(forms(paradigm("fīlia -ae f.; fīlius -ī m.", "noun"), 0, 1), /fīlī fīliī$/);
});

test("vocatives", () => {
  assert.match(forms(paradigm("fīlius -ī m.", "noun")), /fīlī fīliī$/);
  assert.match(forms(paradigm("bonus -a -um", "adjective")), /bone bona bonum$/);
  assert.match(forms(paradigm("meus -a -um", "pronoun")), /mī mea meum$/);
  assert.match(forms(paradigm("tuus -a -um", "pronoun")), /tuō$/); // other possessives: no vocative row
});

test("comparison of adjectives and adverbs", () => {
  assert.equal(cellsOf(paradigm("bonus -a -um", "adjective"), "comparison"), "bonus bene melior melius optimus optimē");
  assert.equal(cellsOf(paradigm("ācer ācris ācre", "adjective"), "comparison"), "ācer ācriter ācrior ācrius ācerrimus ācerrimē");
  assert.equal(cellsOf(paradigm("miser misera miserum", "adjective"), "comparison"), "miser miserē miserior miserius miserrimus miserrimē");
  assert.equal(cellsOf(paradigm("similis -e", "adjective"), "comparison"), "similis similiter similior similius simillimus simillimē");
  assert.equal(cellsOf(paradigm("potēns potentis", "adjective"), "comparison"), "potēns potenter potentior potentius potentissimus potentissimē");
  assert.equal(paradigm("aureus -a -um", "adjective")!.find((s) => s.title === "comparison"), undefined);
  assert.equal(cellsOf(paradigm("saepe", "adverb"), "comparison"), "saepe saepius saepissimē");
});

test("imperatives, gerund, gerundive, supine, future passive infinitive", () => {
  const amo = paradigm("amō amāre amāvī amātum", "verb", "1st conjugation");
  assert.equal(cellsOf(amo, "imperative"), "amā amāte amātō amātōte amātō amantō");
  assert.equal(cellsOf(amo, "imperativePassive"), "amāre amāminī");
  assert.equal(cellsOf(amo, "gerundSection"), "amandī amandō amandum amandō amandus amanda amandum amātum amātū");
  assert.match(cellsOf(amo, "nonFinite"), /amātum īrī/);
  assert.match(cellsOf(paradigm("capiō capere cēpī captum", "verb"), "imperative"), /capiuntō/);
  assert.match(cellsOf(paradigm("eō īre iī/īvī itum", "verb", "irregular"), "nonFinite"), /itūrus esse/);
  assert.match(cellsOf(paradigm("sum esse fuī", "verb", "irregular"), "nonFinite"), /futūrus esse/);
  assert.equal(cellsOf(paradigm("hortor hortārī hortātus sum", "verb", "deponent"), "gerundSection"), "hortandī hortandō hortandum hortandō hortandus hortanda hortandum hortātum hortātū");
  assert.match(cellsOf(paradigm("ferō ferre tulī lātum", "verb", "irregular"), "indicativePassive"), /^feror ferimur ferris/);
});

test("intransitive verbs have a supine and future participle but no passive", () => {
  const venio = paradigm("veniō venīre vēnī ventum", "verb", "4th conjugation")!;
  assert.ok(!venio.some((s) => s.title === "indicativePassive"));
  assert.doesNotMatch(cellsOf(venio, "nonFinite"), /ventus/);
  assert.match(cellsOf(venio, "nonFinite"), /ventūrus/);
  assert.equal(cellsOf(venio, "gerundSection"), "veniendī veniendō veniendum veniendō ventum ventū");
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

test("isInvariable: indeclinables and single-form defectives, not other defectives", () => {
  assert.equal(isInvariable("fore", "irregular"), true);
  assert.equal(isInvariable("nihil", "indeclinable"), true);
  assert.equal(isInvariable("aiō", "irregular"), false);
});
