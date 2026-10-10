// Rule-based Latin inflection: builds declension/conjugation tables from the dictionary entry.
// Returns null when a word's shape isn't covered, so the UI never shows a guessed paradigm.
import { parseHeadword } from "./format";
import type { StringKey } from "./strings";

export interface FormRow {
  label: StringKey;
  cells: string[];
}
export interface FormTable {
  /** Table caption (tense, number…); omitted when the section has a single table */
  title?: StringKey;
  /** Column headers; empty for single-column lists */
  cols: StringKey[];
  rows: FormRow[];
}
export interface FormSection {
  title: StringKey;
  tables: FormTable[];
}
export type Paradigm = FormSection[];

const CASES: StringKey[] = ["caseNom", "caseGen", "caseDat", "caseAcc", "caseAbl"];
const PERSONS: StringKey[] = ["person1", "person2", "person3"];
const VOWELS = "aeiouyāēīōūȳ";

/** Attach an abbreviated ending ("-cipere") to a base word by aligning its start ("accipiō" → "accipere"). */
export function attach(base: string, suffix: string, minOverlap = 1): string | null {
  const s = suffix.replace(/^-/, "");
  let best = -1;
  let bestLen = 0;
  for (let i = 1; i < base.length; i++) {
    let k = 0;
    while (i + k < base.length && k < s.length && base[i + k] === s[k]) k++;
    if (k > 0 && k >= bestLen) [best, bestLen] = [i, k];
  }
  return best < 0 || bestLen < minOverlap ? null : base.slice(0, best) + s;
}

const stripLastSyllable = (w: string) => w.replace(new RegExp(`[${VOWELS}][^${VOWELS}]*$`), "");
const syllables = (w: string) => (w.match(new RegExp(`ae|au|oe|[${VOWELS}]`, "g")) ?? []).length;
const isConsonant = (c: string | undefined) => !!c && !VOWELS.includes(c);

/** Split "sg" forms into a [sg, pl] case table. */
const caseTable = (sg: string[] | null, pl: string[] | null, voc?: [string, string]): FormTable => {
  const cols: StringKey[] = [];
  if (sg) cols.push("singular");
  if (pl) cols.push("plural");
  const rows = CASES.map((label, i) => ({ label, cells: [...(sg ? [sg[i]] : []), ...(pl ? [pl[i]] : [])] }));
  if (voc) rows.push({ label: "caseVoc", cells: [...(sg ? [voc[0]] : []), ...(pl ? [voc[1]] : [])] });
  return { cols, rows };
};

/** Gendered adjective/pronoun forms: each of sg/pl is [m, f, n] × 5 cases. */
const genderTables = (sg: string[][] | null, pl: string[][] | null): FormSection[] => {
  const t = (forms: string[][], title: StringKey): FormTable => ({
    title,
    cols: ["genderM", "genderF", "genderN"],
    rows: CASES.map((label, i) => ({ label, cells: forms.map((g) => g[i]) })),
  });
  return [{ title: "declension", tables: [...(sg ? [t(sg, "singular")] : []), ...(pl ? [t(pl, "plural")] : [])] }];
};

// ---------------------------------------------------------------- pronouns & other fixed tables

const P = (s: string) => s.split(" ").map((x) => x.replace(/_/g, " "));
/** Gendered: "m-forms | f-forms | n-forms" (5 cases each). */
const G = (sg: string, pl: string | null) =>
  genderTables(
    sg.split("|").map((g) => P(g.trim())),
    pl ? pl.split("|").map((g) => P(g.trim())) : null
  );
const personal = (sg: string, pl: string): Paradigm => [{ title: "declension", tables: [caseTable(P(sg), P(pl))] }];

const PERS1 = personal("ego meī mihi mē mē", "nōs nostrum/nostrī nōbīs nōs nōbīs");
const PERS2 = personal("tū tuī tibi tē tē", "vōs vestrum/vestrī vōbīs vōs vōbīs");
const QUI_PL = "quī quōrum quibus quōs quibus | quae quārum quibus quās quibus | quae quōrum quibus quae quibus";

const FIXED: Record<string, Paradigm> = {
  ego: PERS1,
  nōs: PERS1,
  tū: PERS2,
  vōs: PERS2,
  is: G(
    "is eius eī eum eō | ea eius eī eam eā | id eius eī id eō",
    "eī/iī eōrum eīs/iīs eōs eīs/iīs | eae eārum eīs/iīs eās eīs/iīs | ea eōrum eīs/iīs ea eīs/iīs"
  ),
  hic: G(
    "hic huius huic hunc hōc | haec huius huic hanc hāc | hoc huius huic hoc hōc",
    "hī hōrum hīs hōs hīs | hae hārum hīs hās hīs | haec hōrum hīs haec hīs"
  ),
  ille: G(
    "ille illīus illī illum illō | illa illīus illī illam illā | illud illīus illī illud illō",
    "illī illōrum illīs illōs illīs | illae illārum illīs illās illīs | illa illōrum illīs illa illīs"
  ),
  iste: G(
    "iste istīus istī istum istō | ista istīus istī istam istā | istud istīus istī istud istō",
    "istī istōrum istīs istōs istīs | istae istārum istīs istās istīs | ista istōrum istīs ista istīs"
  ),
  ipse: G(
    "ipse ipsīus ipsī ipsum ipsō | ipsa ipsīus ipsī ipsam ipsā | ipsum ipsīus ipsī ipsum ipsō",
    "ipsī ipsōrum ipsīs ipsōs ipsīs | ipsae ipsārum ipsīs ipsās ipsīs | ipsa ipsōrum ipsīs ipsa ipsīs"
  ),
  īdem: G(
    "īdem eiusdem eīdem eundem eōdem | eadem eiusdem eīdem eandem eādem | idem eiusdem eīdem idem eōdem",
    "eīdem/īdem eōrundem eīsdem/īsdem eōsdem eīsdem/īsdem | eaedem eārundem eīsdem/īsdem eāsdem eīsdem/īsdem | eadem eōrundem eīsdem/īsdem eadem eīsdem/īsdem"
  ),
  quī: G("quī cuius cui quem quō | quae cuius cui quam quā | quod cuius cui quod quō", QUI_PL),
  quis: G("quis cuius cui quem quō | quis cuius cui quem quō | quid cuius cui quid quō", QUI_PL),
  quīdam: G(
    "quīdam cuiusdam cuidam quendam quōdam | quaedam cuiusdam cuidam quandam quādam | quoddam cuiusdam cuidam quoddam quōdam",
    "quīdam quōrundam quibusdam quōsdam quibusdam | quaedam quārundam quibusdam quāsdam quibusdam | quaedam quōrundam quibusdam quaedam quibusdam"
  ),
  quisque: G(
    "quisque cuiusque cuique quemque quōque | quaeque cuiusque cuique quamque quāque | quidque cuiusque cuique quidque quōque",
    null
  ),
  duo: G(
    "duo duōrum duōbus duōs/duo duōbus | duae duārum duābus duās duābus | duo duōrum duōbus duo duōbus",
    null
  ).map((s) => ({ ...s, tables: s.tables.map((t) => ({ ...t, title: "plural" as StringKey })) })),
  trēs: G("trēs trium tribus trēs tribus | trēs trium tribus trēs tribus | tria trium tribus tria tribus", null).map(
    (s) => ({ ...s, tables: s.tables.map((t) => ({ ...t, title: "plural" as StringKey })) })
  ),
  aliquis: G(
    "aliquis alicuius alicui aliquem aliquō | aliqua alicuius alicui aliquam aliquā | aliquid alicuius alicui aliquid aliquō",
    "aliquī aliquōrum aliquibus aliquōs aliquibus | aliquae aliquārum aliquibus aliquās aliquibus | aliqua aliquōrum aliquibus aliqua aliquibus"
  ),
  nēmō: [{ title: "declension", tables: [caseTable(P("nēmō nūllīus nēminī nēminem nūllō"), null)] }],
  deus: [
    {
      title: "declension",
      tables: [caseTable(P("deus deī deō deum deō"), P("dī/deī deōrum dīs/deīs deōs dīs/deīs"), ["deus", "dī"])],
    },
  ],
  domus: [
    {
      title: "declension",
      tables: [
        caseTable(P("domus domūs domuī/domō domum domō/domū"), P("domūs domuum/domōrum domibus domōs/domūs domibus")),
      ],
    },
  ],
  vīs: [{ title: "declension", tables: [caseTable(P("vīs — — vim vī"), P("vīrēs vīrium vīribus vīrēs vīribus"))] }],
  bōs: [
    {
      title: "declension",
      tables: [caseTable(P("bōs bovis bovī bovem bove"), P("bovēs boum bōbus/būbus bovēs bōbus/būbus"))],
    },
  ],
};

// ---------------------------------------------------------------- nouns

const I_STEM_EXCEPTIONS = new Set(["canis", "iuvenis", "senex", "pater", "māter", "frāter", "sēdēs", "vātēs", "volucris"]);

function noun(nom: string, genRaw: string | undefined, note: string): Paradigm | null {
  if (!genRaw) return null;
  const neuter = /\bn\./.test(note);
  const gen = genRaw.startsWith("-") ? expandGen(nom, genRaw) : genRaw;
  if (!gen) return null;
  const pluralOnly = /pl\./.test(note) || /(ōrum|ārum|um)$/.test(gen) && !/(ae|ī|is|ūs|eī|ēī)$/.test(gen);
  let sg: string[];
  let pl: string[];
  let voc: [string, string] | undefined;
  const third = gen.endsWith("is") || gen.endsWith("ium") || (pluralOnly && nom.endsWith("ēs"));
  if (third) {
    const st = gen.replace(/(is|ium|um)$/, "");
    const pureNeuter = neuter && (/(e|al|ar)$/.test(nom) || gen.endsWith("ium"));
    const iStem =
      pureNeuter ||
      gen.endsWith("ium") ||
      (!neuter &&
        !I_STEM_EXCEPTIONS.has(nom) &&
        ((/(is|ēs)$/.test(nom) && syllables(nom) === syllables(gen)) ||
          (/[sx]$/.test(nom) && isConsonant(st.at(-1)) && isConsonant(st.at(-2)))));
    const genPl = pluralOnly && gen.endsWith("um") ? gen : st + (iStem ? "ium" : "um");
    if (neuter) {
      const npl = st + (pureNeuter ? "ia" : "a");
      sg = [nom, st + "is", st + "ī", nom, st + (pureNeuter && !gen.endsWith("ium") ? "ī" : "e")];
      pl = [npl, genPl, st + "ibus", npl, st + "ibus"];
    } else {
      sg = [nom, st + "is", st + "ī", st + "em", st + "e"];
      pl = [st + "ēs", genPl, st + "ibus", st + "ēs", st + "ibus"];
    }
  } else if (/(eī|ēī)$/.test(gen) && nom.endsWith("ēs")) {
    const st = nom.slice(0, -2);
    const e = isConsonant(st.at(-1)) ? "eī" : "ēī";
    sg = [nom, st + e, st + e, st + "em", st + "ē"];
    pl = [st + "ēs", st + "ērum", st + "ēbus", st + "ēs", st + "ēbus"];
  } else if (gen.endsWith("ārum") || gen.endsWith("ae")) {
    const st = gen.endsWith("ae") ? gen.slice(0, -2) : gen.slice(0, -4);
    sg = [nom, st + "ae", st + "ae", st + "am", st + "ā"];
    pl = [st + "ae", st + "ārum", st + "īs", st + "ās", st + "īs"];
  } else if (gen.endsWith("ōrum") || gen.endsWith("ī")) {
    const st = gen.endsWith("ī") ? gen.slice(0, -1) : gen.slice(0, -4);
    if (neuter || nom.endsWith("um") || (pluralOnly && nom.endsWith("a"))) {
      sg = [nom, st + "ī", st + "ō", nom, st + "ō"];
      pl = [st + "a", st + "ōrum", st + "īs", st + "a", st + "īs"];
    } else {
      sg = [nom, st + "ī", st + "ō", st + "um", st + "ō"];
      pl = [st + "ī", st + "ōrum", st + "īs", st + "ōs", st + "īs"];
      if (nom.endsWith("ius")) voc = [nom.slice(0, -3) + "ī", pl[0]];
      else if (nom.endsWith("us")) voc = [nom.slice(0, -2) + "e", pl[0]];
    }
  } else if (gen.endsWith("ūs") && /(us|ū)$/.test(nom)) {
    const st = gen.slice(0, -2);
    if (nom.endsWith("ū")) {
      sg = [nom, st + "ūs", st + "ū", nom, st + "ū"];
      pl = [st + "ua", st + "uum", st + "ibus", st + "ua", st + "ibus"];
    } else {
      sg = [nom, st + "ūs", st + "uī", st + "um", st + "ū"];
      pl = [st + "ūs", st + "uum", st + "ibus", st + "ūs", st + "ibus"];
    }
  } else {
    return null;
  }
  if (pluralOnly) return [{ title: "declension", tables: [caseTable(null, pl)] }];
  return [{ title: "declension", tables: [caseTable(sg, pl, voc)] }];
}

function expandGen(nom: string, suf: string): string {
  const s = suf.slice(1);
  if (s === "ae" && nom.endsWith("a")) return nom.slice(0, -1) + s;
  if (s === "ārum" && nom.endsWith("ae")) return nom.slice(0, -2) + s;
  if (s === "ī" && /(us|um)$/.test(nom)) return nom.slice(0, -2) + s;
  if (s === "ōrum" && /(ī|a)$/.test(nom)) return nom.slice(0, -1) + s;
  if (s === "ūs" && nom.endsWith("us")) return nom.slice(0, -2) + s;
  if (s === "ūs" && nom.endsWith("ū")) return nom.slice(0, -1) + s;
  if (/^(eī|ēī)$/.test(s) && nom.endsWith("ēs")) return nom.slice(0, -2) + s;
  if (s === "iī" && nom.endsWith("ium")) return nom.slice(0, -2) + "ī"; // convīvium -iī
  if (s === "ium" && nom.endsWith("ia")) return nom.slice(0, -1) + "um"; // moenia -ium
  // parēns -ntis → parentis (vowel before -nt- is short)
  if (s.startsWith("nt") && nom.endsWith("ns")) return nom.slice(0, -2).normalize("NFD").replace(/\u0304$/, "").normalize("NFC") + s;
  // a consonant-initial ending marks its own boundary (prīnceps -cipis); a vowel-initial one needs a real overlap
  // (hostis -is, pauper -eris), otherwise it replaces the last syllable (virgō -inis, scelus -eris)
  return attach(nom, suf, isConsonant(s[0]) ? 1 : 2) ?? stripLastSyllable(nom) + s;
}

// ---------------------------------------------------------------- adjectives

const PRONOMINAL = new Set(["ūnus", "nūllus", "ūllus", "sōlus", "tōtus", "alius", "alter", "uter", "neuter", "uterque"]);
const CONSONANT_ADJ = new Set(["vetus", "dīves", "pauper", "prīnceps", "particeps", "memor", "compos", "superstes"]);

function adjective(forms: string[]): Paradigm | null {
  const [m, f, n] = forms;
  if (!f) return null;
  // plural-only 1st/2nd: paucī -ae -a
  if (m.endsWith("ī") && f === "-ae" && n === "-a") {
    const st = m.slice(0, -1);
    return genderTables(null, [
      [m, st + "ōrum", st + "īs", st + "ōs", st + "īs"],
      [st + "ae", st + "ārum", st + "īs", st + "ās", st + "īs"],
      [st + "a", st + "ōrum", st + "īs", st + "a", st + "īs"],
    ]);
  }
  // 1st/2nd declension: māgnus -a -um, miser misera miserum
  if (n && /a$/.test(f) && /um$/.test(n)) {
    const st =
      f === "-a" ? (m.endsWith("us") ? m.slice(0, -2) : m) : (f.startsWith("-") ? attach(m, f) : f)?.slice(0, -1);
    if (!st) return null;
    const pron = PRONOMINAL.has(m);
    const neutNom = m === "alius" ? "aliud" : st + "um";
    const gen = (e: string) => (pron ? st + "īus" : st + e);
    const dat = (e: string) => (pron ? st + "ī" : st + e);
    return genderTables(
      [
        [m, gen("ī"), dat("ō"), st + "um", st + "ō"],
        [st + "a", gen("ae"), dat("ae"), st + "am", st + "ā"],
        [neutNom, gen("ī"), dat("ō"), neutNom, st + "ō"],
      ],
      [
        [st + "ī", st + "ōrum", st + "īs", st + "ōs", st + "īs"],
        [st + "ae", st + "ārum", st + "īs", st + "ās", st + "īs"],
        [st + "a", st + "ōrum", st + "īs", st + "a", st + "īs"],
      ]
    );
  }
  // 3rd declension
  let st: string | null;
  let mNom = m;
  let fNom = m;
  let nNom: string;
  let consonant = CONSONANT_ADJ.has(m);
  if (/ior$/.test(m) && /ius$/.test(f)) {
    // comparative: prior prius
    st = m.slice(0, -2) + "ōr";
    nNom = f;
    consonant = true;
  } else if (n && /e$/.test(n)) {
    // ācer ācris ācre / celer -is -e
    fNom = f.startsWith("-") ? (f === "-is" ? m + "is" : attach(m, f) ?? "") : f;
    st = fNom.endsWith("is") ? fNom.slice(0, -2) : null;
    nNom = st + "e";
    mNom = m;
  } else if (m.endsWith("is") && (f === "-e" || f === m.slice(0, -2) + "e")) {
    st = m.slice(0, -2);
    nNom = st + "e";
  } else {
    // one ending: ingēns ingentis
    const gen = f.startsWith("-") ? expandGen(m, f) : f;
    st = gen.endsWith("is") ? gen.slice(0, -2) : null;
    nNom = m;
  }
  if (!st) return null;
  const abl = consonant ? "e" : "ī";
  const nPl = st + (consonant ? "a" : "ia");
  const genPl = st + (consonant ? "um" : "ium");
  const mf = (nom: string) => [nom, st + "is", st + "ī", st + "em", st + abl];
  const mfPl = [st + "ēs", genPl, st + "ibus", st + "ēs", st + "ibus"];
  return genderTables(
    [mf(mNom), mf(fNom), [nNom, st + "is", st + "ī", nNom, st + abl]],
    [mfPl, mfPl, [nPl, genPl, st + "ibus", nPl, st + "ibus"]]
  );
}

// ---------------------------------------------------------------- verbs

type Conj = 1 | 2 | 3 | 5 | 4; // 5 = 3rd -iō
const SUM = {
  pres: "sum es est sumus estis sunt",
  impf: "eram erās erat erāmus erātis erant",
  fut: "erō eris erit erimus eritis erunt",
  subj: "sim sīs sit sīmus sītis sint",
  impfSubj: "essem essēs esset essēmus essētis essent",
};
const ends = (s: string) => s.split(" ").map((x) => x.replace(/_/g, " "));
const persons = (stem: string, e: string) => ends(e).map((x) => stem + x);

interface Present {
  pres: string[];
  impf: string[];
  fut: string[];
  subj: string[];
  impfSubj: string[];
  imper: [string, string] | null;
  inf: string;
  part: string | null;
}
interface PresentPassive {
  pres: string[];
  impf: string[];
  fut: string[];
  subj: string[];
  impfSubj: string[];
  imper: [string, string] | null;
  inf: string;
}

const THEME: Record<Conj, { impf: string; inf: string; infP: string; part: string; subj: string }> = {
  1: { impf: "ā", inf: "āre", infP: "ārī", part: "āns", subj: "" },
  2: { impf: "ē", inf: "ēre", infP: "ērī", part: "ēns", subj: "e" },
  3: { impf: "ē", inf: "ere", infP: "ī", part: "ēns", subj: "" },
  5: { impf: "iē", inf: "ere", infP: "ī", part: "iēns", subj: "i" },
  4: { impf: "iē", inf: "īre", infP: "īrī", part: "iēns", subj: "i" },
};
const PRES_A: Record<Conj, string> = {
  1: "ō ās at āmus ātis ant",
  2: "eō ēs et ēmus ētis ent",
  3: "ō is it imus itis unt",
  5: "iō is it imus itis iunt",
  4: "iō īs it īmus ītis iunt",
};
const PRES_P: Record<Conj, string> = {
  1: "or āris ātur āmur āminī antur",
  2: "eor ēris ētur ēmur ēminī entur",
  3: "or eris itur imur iminī untur",
  5: "ior eris itur imur iminī iuntur",
  4: "ior īris ītur īmur īminī iuntur",
};
const IMPER_A: Record<Conj, [string, string]> = { 1: ["ā", "āte"], 2: ["ē", "ēte"], 3: ["e", "ite"], 5: ["e", "ite"], 4: ["ī", "īte"] };
const IMPER_P: Record<Conj, [string, string]> = {
  1: ["āre", "āminī"],
  2: ["ēre", "ēminī"],
  3: ["ere", "iminī"],
  5: ["ere", "iminī"],
  4: ["īre", "īminī"],
};

function presentActive(st: string, c: Conj): Present {
  const th = THEME[c];
  const futA = c <= 2 ? persons(st + th.impf.slice(-1), "bō bis bit bimus bitis bunt") : persons(st + (c === 3 ? "" : "i"), "am ēs et ēmus ētis ent");
  const infStem = st + th.inf.slice(0, -1);
  return {
    pres: persons(st, PRES_A[c]),
    impf: persons(st + th.impf, "bam bās bat bāmus bātis bant"),
    fut: futA,
    subj: c === 1 ? persons(st, "em ēs et ēmus ētis ent") : persons(st + th.subj, "am ās at āmus ātis ant"),
    impfSubj: persons(infStem, "em ēs et ēmus ētis ent"),
    imper: [st + IMPER_A[c][0], st + IMPER_A[c][1]],
    inf: st + th.inf,
    part: st + th.part,
  };
}

function presentPassive(st: string, c: Conj): PresentPassive {
  const th = THEME[c];
  return {
    pres: persons(st, PRES_P[c]),
    impf: persons(st + th.impf, "bar bāris bātur bāmur bāminī bantur"),
    fut:
      c <= 2
        ? persons(st + th.impf.slice(-1), "bor beris bitur bimur biminī buntur")
        : persons(st + (c === 3 ? "" : "i"), "ar ēris ētur ēmur ēminī entur"),
    subj: c === 1 ? persons(st, "er ēris ētur ēmur ēminī entur") : persons(st + th.subj, "ar āris ātur āmur āminī antur"),
    impfSubj: persons(st + th.inf.slice(0, -1), "er ēris ētur ēmur ēminī entur"),
    imper: [st + IMPER_P[c][0], st + IMPER_P[c][1]],
    inf: st + th.infP,
  };
}

/** Irregular present systems, keyed by base verb; compounds add a prefix. */
function irregularPresent(base: string, prefix: string): Present | null {
  const pre = (xs: string[]) => xs.map((x) => (prefix === "prō" && x.startsWith("e") ? "prōd" : prefix) + x);
  const mk = (p: Omit<Present, "pres" | "impf" | "fut" | "subj" | "impfSubj"> & Record<"pres" | "impf" | "fut" | "subj" | "impfSubj", string>): Present => ({
    pres: pre(ends(p.pres)),
    impf: pre(ends(p.impf)),
    fut: pre(ends(p.fut)),
    subj: pre(ends(p.subj)),
    impfSubj: pre(ends(p.impfSubj)),
    imper: p.imper && (pre(p.imper) as [string, string]),
    inf: pre([p.inf])[0],
    part: p.part && pre([p.part])[0],
  });
  switch (base) {
    case "sum":
      return mk({ ...SUM, imper: ["es", "este"], inf: "esse", part: null });
    case "possum":
      return mk({
        pres: "possum potes potest possumus potestis possunt",
        impf: "poteram poterās poterat poterāmus poterātis poterant",
        fut: "poterō poteris poterit poterimus poteritis poterunt",
        subj: "possim possīs possit possīmus possītis possint",
        impfSubj: "possem possēs posset possēmus possētis possent",
        imper: null,
        inf: "posse",
        part: "potēns",
      });
    case "eō":
      return mk({
        pres: "eō īs it īmus ītis eunt",
        impf: "ībam ībās ībat ībāmus ībātis ībant",
        fut: "ībō ībis ībit ībimus ībitis ībunt",
        subj: "eam eās eat eāmus eātis eant",
        impfSubj: "īrem īrēs īret īrēmus īrētis īrent",
        imper: ["ī", "īte"],
        inf: "īre",
        part: "iēns",
      });
    case "ferō":
      return mk({
        pres: "ferō fers fert ferimus fertis ferunt",
        impf: "ferēbam ferēbās ferēbat ferēbāmus ferēbātis ferēbant",
        fut: "feram ferēs feret ferēmus ferētis ferent",
        subj: "feram ferās ferat ferāmus ferātis ferant",
        impfSubj: "ferrem ferrēs ferret ferrēmus ferrētis ferrent",
        imper: ["fer", "ferte"],
        inf: "ferre",
        part: "ferēns",
      });
    case "volō":
      return mk({
        pres: "volō vīs vult volumus vultis volunt",
        impf: "volēbam volēbās volēbat volēbāmus volēbātis volēbant",
        fut: "volam volēs volet volēmus volētis volent",
        subj: "velim velīs velit velīmus velītis velint",
        impfSubj: "vellem vellēs vellet vellēmus vellētis vellent",
        imper: null,
        inf: "velle",
        part: "volēns",
      });
    case "nōlō":
      return mk({
        pres: "nōlō nōn_vīs nōn_vult nōlumus nōn_vultis nōlunt",
        impf: "nōlēbam nōlēbās nōlēbat nōlēbāmus nōlēbātis nōlēbant",
        fut: "nōlam nōlēs nōlet nōlēmus nōlētis nōlent",
        subj: "nōlim nōlīs nōlit nōlīmus nōlītis nōlint",
        impfSubj: "nōllem nōllēs nōllet nōllēmus nōllētis nōllent",
        imper: ["nōlī", "nōlīte"],
        inf: "nōlle",
        part: "nōlēns",
      });
    case "mālō":
      return mk({
        pres: "mālō māvīs māvult mālumus māvultis mālunt",
        impf: "mālēbam mālēbās mālēbat mālēbāmus mālēbātis mālēbant",
        fut: "mālam mālēs mālet mālēmus mālētis mālent",
        subj: "mālim mālīs mālit mālīmus mālītis mālint",
        impfSubj: "māllem māllēs māllet māllēmus māllētis māllent",
        imper: null,
        inf: "mālle",
        part: null,
      });
    case "fīō":
      return mk({
        pres: "fīō fīs fit fīmus fītis fīunt",
        impf: "fīēbam fīēbās fīēbat fīēbāmus fīēbātis fīēbant",
        fut: "fīam fīēs fīet fīēmus fīētis fīent",
        subj: "fīam fīās fīat fīāmus fīātis fīant",
        impfSubj: "fierem fierēs fieret fierēmus fierētis fierent",
        imper: ["fī", "fīte"],
        inf: "fierī",
        part: null,
      });
  }
  return null;
}

const FERO_PASSIVE = (prefix: string): PresentPassive => {
  const p = presentPassive(prefix + "fer", 3);
  p.pres[1] = prefix + "ferris";
  p.pres[2] = prefix + "fertur";
  p.impfSubj = persons(prefix + "ferr", "er ēris ētur ēmur ēminī entur");
  p.imper = [prefix + "ferre", prefix + "feriminī"];
  p.inf = prefix + "ferrī";
  return p;
};

const tense = (title: StringKey, forms: string[]): FormTable => ({
  title,
  cols: ["singular", "plural"],
  rows: PERSONS.map((label, i) => ({ label, cells: [forms[i], forms[i + 3]] })),
});
const list = (rows: [StringKey, string | null | undefined][]): FormTable => ({
  cols: [],
  rows: rows.filter((r): r is [StringKey, string] => !!r[1]).map(([label, f]) => ({ label, cells: [f] })),
});

/** "amātus sum" style periphrastic forms. */
const compound = (ppp: string, aux: string) => {
  const pl = ppp.replace(/us$/, "ī");
  return ends(aux).map((a, i) => `${i < 3 ? ppp : pl} ${a}`);
};

const PERF_ENDINGS = {
  perf: "ī istī it imus istis ērunt",
  plupf: "eram erās erat erāmus erātis erant",
  futPf: "erō eris erit erimus eritis erint",
  subj: "erim erīs erit erīmus erītis erint",
  plupfSubj: "issem issēs isset issēmus issētis issent",
};

interface VerbParts {
  lemma: string;
  conj: Conj | null;
  stem: string;
  /** Perfect active 1sg (e.g. "amāvī") */
  perf: string | null;
  /** Perfect passive participle (e.g. "amātus") */
  ppp: string | null;
  deponent: boolean;
  irregular: { base: string; prefix: string } | null;
  /** audeō audēre ausus sum: active present system, perfect formed like a deponent's, no passive */
  semiDeponent?: boolean;
}

function conjFromInf(lemma: string, inf: string, deponent: boolean): Conj | null {
  if (deponent) {
    if (inf.endsWith("ārī")) return 1;
    if (inf.endsWith("ērī")) return 2;
    if (inf.endsWith("īrī")) return 4;
    if (inf.endsWith("ī")) return lemma.endsWith("ior") ? 5 : 3;
    return null;
  }
  if (inf.endsWith("āre") || (lemma.endsWith("dō") && inf.endsWith("dare"))) return 1;
  if (inf.endsWith("ēre")) return 2;
  if (inf.endsWith("īre")) return 4;
  if (inf.endsWith("ere")) return lemma.endsWith("iō") ? 5 : 3;
  return null;
}

const STEM_CUT: Record<Conj, [string, string]> = { 1: ["ō", "or"], 2: ["eō", "eor"], 3: ["ō", "or"], 5: ["iō", "ior"], 4: ["iō", "ior"] };
const IRREGULAR_BASES = ["possum", "sum", "ferō", "volō", "nōlō", "mālō", "fīō", "eō"];

export function verbParts(hw: string, detail: string | undefined): VerbParts | null {
  const forms = parseHeadword(hw)[0].forms.map((f) => f.split("/")[0].replace(/,$/, ""));
  const [lemma, infRaw, ...rest] = forms;
  if (!lemma || !infRaw) return null;
  const deponent = lemma.endsWith("or") || detail === "deponent";

  // irregular verbs and their compounds
  if (detail === "irregular" || IRREGULAR_BASES.includes(lemma)) {
    const base = IRREGULAR_BASES.find((b) => lemma.endsWith(b) && (b !== "sum" || /esse$/.test(infRaw)));
    if (base && !(base === "eō" && !/īre$/.test(infRaw))) {
      const prefix = lemma.slice(0, -base.length);
      const full = (f: string | undefined) => (f ? (f.startsWith("-") ? prefix + f.slice(1) : f) : null);
      const perf = full(rest[0]);
      const ppp = base === "fīō" ? full(rest[0]) : full(rest[1])?.replace(/um$/, "us") ?? null;
      return {
        lemma, conj: null, stem: "", deponent: false, irregular: { base, prefix },
        perf: base === "fīō" ? null : perf, ppp: base === "ferō" || base === "fīō" ? ppp : null,
      };
    }
  }

  // perfect-only verbs: meminī meminisse, ōdī ōdisse, coepī coepisse
  if (lemma.endsWith("ī") && infRaw.endsWith("isse")) {
    return { lemma, conj: null, stem: "", perf: lemma, ppp: rest[0]?.endsWith("us") ? rest[0] : null, deponent: false, irregular: null };
  }

  // the infinitive tells us the conjugation; abbreviated ones also reveal the compound prefix
  let prefix: string | null = null;
  let inf = infRaw;
  if (infRaw.startsWith("-")) {
    const s = infRaw.slice(1);
    // "-cipere", "-igere": more than a bare ending, so it marks the compound boundary
    if (isConsonant(s[0]) || !/^(āre|ēre|ere|īre|ārī|ērī|ī|īrī)$/.test(s)) {
      inf = attach(lemma, infRaw) ?? "";
      prefix = inf ? inf.slice(0, inf.length - s.length) : null;
    } else {
      inf = "-" + s; // conjugation is decided from the ending alone
    }
  }
  const conj = conjFromInf(lemma, inf, deponent);
  if (!conj) return null;
  const cut = STEM_CUT[conj][deponent ? 1 : 0];
  if (!lemma.endsWith(cut)) return null;
  const stem = lemma.slice(0, -cut.length);

  const expand = (f: string | undefined): string | null => {
    if (!f) return null;
    if (!f.startsWith("-")) {
      // "compōnō -pōnere posuī" lists the simplex perfect; restore the prefix
      return prefix && f[0] !== lemma[0] ? prefix + f : f;
    }
    const s = f.slice(1);
    if (prefix !== null) return prefix + s;
    if (isConsonant(s[0])) return attach(lemma, f) ?? stem + s;
    return stem.at(-1) === s[0].normalize("NFD")[0] ? stem.slice(0, -1) + s : stem + s;
  };

  let perf: string | null;
  let ppp: string | null;
  if (!deponent && rest[0]?.endsWith("us") && rest[1] === "sum") {
    return { lemma, conj, stem, perf: null, ppp: expand(rest[0]), deponent, irregular: null, semiDeponent: true };
  }
  if (deponent) {
    perf = null;
    ppp = expand(rest[0]) ?? (conj === 1 ? stem + "ātus" : conj === 4 ? stem + "ītus" : null);
  } else {
    perf = expand(rest[0]) ?? (conj === 1 ? stem + "āvī" : conj === 4 ? stem + "īvī" : null);
    const sup = rest[0] ? expand(rest[1]) : conj === 1 ? stem + "ātum" : conj === 4 ? stem + "ītum" : null;
    ppp = sup?.endsWith("um") ? sup.slice(0, -2) + "us" : null;
  }
  return { lemma, conj, stem, perf, ppp, deponent, irregular: null };
}

function verb(hw: string, detail: string | undefined): Paradigm | null {
  if (detail === "impersonal") return null;
  const v = verbParts(hw, detail);
  if (!v) return null;
  let act: Present | null = null;
  let pass: PresentPassive | null = null;
  if (v.irregular) {
    act = irregularPresent(v.irregular.base, v.irregular.prefix);
    if (v.irregular.base === "ferō") pass = FERO_PASSIVE(v.irregular.prefix);
    if (v.irregular.base === "fīō") {
      pass = { ...act!, imper: act!.imper, inf: act!.inf };
      act = null;
    }
  } else if (v.conj) {
    if (v.deponent) pass = presentPassive(v.stem, v.conj);
    else {
      act = presentActive(v.stem, v.conj);
      pass = presentPassive(v.stem, v.conj);
    }
  }
  // dō has short a outside dās/dā/dāns
  if (v.lemma === "dō" && act && pass) {
    const fix = (xs: string[]) => xs.map((x) => (x.startsWith("dā") && !["dās", "dā", "dāns"].includes(x) ? "da" + x.slice(2) : x));
    for (const k of ["pres", "impf", "fut", "subj", "impfSubj"] as const) {
      act[k] = fix(act[k]);
      pass[k] = fix(pass[k]);
    }
    act.imper = fix(act.imper!) as [string, string];
    act.inf = fix([act.inf])[0];
    pass.inf = fix([pass.inf])[0];
  }
  // fac, dīc, dūc
  if (act?.imper && /(dīcō|dūcō)$|^faciō$/.test(v.lemma)) act.imper[0] = act.imper[0].slice(0, -1);

  const P = v.perf?.endsWith("ī") ? v.perf.slice(0, -1) : null;
  const eo = v.irregular?.base === "eō";
  const pf = (e: string) => {
    if (!P) return [];
    const xs = persons(P, e);
    return eo && P.endsWith("i") ? xs.map((x) => x.replace(/iis/, "īs")) : xs;
  };
  const fap = v.ppp ? v.ppp.replace(/us$/, "ūrus") : null;
  const sections: Paradigm = [];

  // Deponents (and fīō) use passive forms with active meaning
  const mainP = v.deponent || v.irregular?.base === "fīō";
  // Semi-deponents: active present system, "ausus sum" perfect system, no passive
  const semi = v.semiDeponent && v.ppp ? v.ppp : null;
  if (semi) pass = null;
  if (act || P) {
    const t: FormTable[] = [];
    if (act) t.push(tense("tensePres", act.pres), tense("tenseImpf", act.impf), tense("tenseFut", act.fut));
    if (P) t.push(tense("tensePerf", pf(PERF_ENDINGS.perf)), tense("tensePlupf", pf(PERF_ENDINGS.plupf)), tense("tenseFutPf", pf(PERF_ENDINGS.futPf)));
    if (semi) t.push(tense("tensePerf", compound(semi, SUM.pres)), tense("tensePlupf", compound(semi, SUM.impf)), tense("tenseFutPf", compound(semi, SUM.fut)));
    sections.push({ title: "indicativeActive", tables: t });
  }
  if (mainP && pass && v.ppp) {
    sections.push({
      title: "indicative",
      tables: [
        tense("tensePres", pass.pres), tense("tenseImpf", pass.impf), tense("tenseFut", pass.fut),
        tense("tensePerf", compound(v.ppp, SUM.pres)), tense("tensePlupf", compound(v.ppp, SUM.impf)), tense("tenseFutPf", compound(v.ppp, SUM.fut)),
      ],
    });
    sections.push({
      title: "subjunctive",
      tables: [
        tense("tensePres", pass.subj), tense("tenseImpf", pass.impfSubj),
        tense("tensePerf", compound(v.ppp, SUM.subj)), tense("tensePlupf", compound(v.ppp, SUM.impfSubj)),
      ],
    });
  }
  if (act || P) {
    const t: FormTable[] = [];
    if (act) t.push(tense("tensePres", act.subj), tense("tenseImpf", act.impfSubj));
    if (P) t.push(tense("tensePerf", pf(PERF_ENDINGS.subj)), tense("tensePlupf", pf(PERF_ENDINGS.plupfSubj)));
    if (semi) t.push(tense("tensePerf", compound(semi, SUM.subj)), tense("tensePlupf", compound(semi, SUM.impfSubj)));
    sections.push({ title: "subjunctiveActive", tables: t });
  }
  const imper = mainP ? pass?.imper : act?.imper;
  if (imper) {
    sections.push({ title: "imperative", tables: [{ cols: ["singular", "plural"], rows: [{ label: "person2", cells: imper }] }] });
  }
  sections.push({
    title: "nonFinite",
    tables: [
      {
        title: "infinitives" as StringKey,
        ...list(
          mainP
            ? [["tensePres", pass?.inf], ["tensePerf", v.ppp && `${v.ppp} esse`], ["tenseFut", fap && `${fap} esse`]]
            : semi
            ? [["presentActive", act?.inf], ["perfectActive", `${semi} esse`], ["futureActive", fap && `${fap} esse`]]
            : [
                ["presentActive", act?.inf],
                ["presentPassive", v.ppp ? pass?.inf : null],
                ["perfectActive", P && pf("isse")[0]],
                ["perfectPassive", v.ppp && `${v.ppp} esse`],
                ["futureActive", fap && `${fap} esse`],
              ]
        ),
      },
      {
        title: "participles" as StringKey,
        ...list(
          mainP
            ? [["tensePres", v.deponent && v.conj ? v.stem + THEME[v.conj].part : null], ["tensePerf", v.ppp], ["tenseFut", fap]]
            : [["presentActive", act?.part], [semi ? "tensePerf" : "perfectPassive", v.ppp], ["futureActive", fap]]
        ),
      },
    ].filter((t) => t.rows.length),
  });
  if (!mainP && pass && v.ppp && !v.irregular) {
    sections.push({
      title: "indicativePassive",
      tables: [
        tense("tensePres", pass.pres), tense("tenseImpf", pass.impf), tense("tenseFut", pass.fut),
        tense("tensePerf", compound(v.ppp, SUM.pres)), tense("tensePlupf", compound(v.ppp, SUM.impf)), tense("tenseFutPf", compound(v.ppp, SUM.fut)),
      ],
    });
    sections.push({
      title: "subjunctivePassive",
      tables: [
        tense("tensePres", pass.subj), tense("tenseImpf", pass.impfSubj),
        tense("tensePerf", compound(v.ppp, SUM.subj)), tense("tensePlupf", compound(v.ppp, SUM.impfSubj)),
      ],
    });
  }
  return sections.filter((s) => s.tables.length);
}

// ---------------------------------------------------------------- entry point

/** pos/detail are the English labels from words.json ("noun", "3rd declension", …). */
export function paradigm(hw: string, pos: string, detail?: string): Paradigm | null {
  const parts = parseHeadword(hw)[0];
  const [first, second] = parts.forms.map((f) => f.replace(/,$/, ""));
  if (FIXED[first]) return FIXED[first];
  if (detail === "indeclinable" || detail === "numeral") return null;
  if (pos === "verb") return verb(hw, detail);
  if (pos === "noun") return noun(first, second, parts.note);
  if (pos === "adjective" || pos === "pronoun") return adjective(parts.forms);
  return null;
}

/**
 * Every form of a word (headword parts + paradigm cells, participles fully declined), for recognising it in text.
 * Periphrastic cells ("amātus sum") contribute only their first word.
 */
export function allForms(hw: string, pos: string, detail?: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => s.split(/[/,]+/).forEach((c) => c.trim() && out.add(c.trim().split(/\s+/)[0]));
  for (const p of parseHeadword(hw)) p.forms.filter((f) => !f.startsWith("-")).forEach(add);
  const par = paradigm(hw, pos, detail);
  par?.forEach((s) => s.tables.forEach((t) => t.rows.forEach((r) => r.cells.forEach(add))));
  if (pos === "verb" && par) {
    for (const f of [...out]) {
      if (!/(us|ūrus)$/.test(f) || f === "—") continue;
      adjective([f, "-a", "-um"])?.forEach((s) => s.tables.forEach((t) => t.rows.forEach((r) => r.cells.forEach(add))));
    }
    // present participles: amāns, amantis…
    for (const f of [...out]) {
      if (!/[āē]ns$/.test(f)) continue;
      const st = f.replace(/([āē])ns$/, (_, v: string) => (v === "ā" ? "ant" : "ent"));
      adjective([f, st + "is"])?.forEach((s) => s.tables.forEach((t) => t.rows.forEach((r) => r.cells.forEach(add))));
    }
  }
  out.delete("—");
  return [...out];
}

/** Spelling-insensitive key: no macrons, lowercase, j→i, v→u. */
export const plainLatin = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/j/g, "i").replace(/v/g, "u");

const ENCLITICS = /(que|ne|ue|cum)$/;

/** Predicate: is this token (from running text) a form of the given word? Shared by the UI and the sentence checker. */
export function wordMatcher(hw: string, pos: string, detail?: string): (token: string) => boolean {
  const forms = new Set(allForms(hw, pos, detail).map((f) => plainLatin(f.replace(/^-|[();:.]/g, ""))).filter(Boolean));
  const lemma = plainLatin(hw.split(/\s+/)[0]);
  const enclitic = /^-?(que|ue|ne)$/.test(lemma) ? lemma.replace("-", "") : null; // -que, -ve, -ne attach to another word
  const stem = lemma.endsWith("-") ? lemma.slice(0, -1).replace(/(us|a|um)$/, "") : null; // "plērus-" → plērīque…
  return (token) => {
    const t = plainLatin(token);
    return (
      forms.has(t) ||
      (ENCLITICS.test(t) && forms.has(t.replace(ENCLITICS, ""))) ||
      (!!enclitic && t.length > enclitic.length && t.endsWith(enclitic)) ||
      (!!stem && t.startsWith(stem))
    );
  };
}
