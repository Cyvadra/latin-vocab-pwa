"use client";
import { useProgress } from "./progress-store";
import { en, zh, type StringKey } from "./strings";
import { strings as zhHant } from "./zh-hant.generated";
import type { Label, Lang, Script } from "./types";

export type { StringKey };

const dict: Record<Lang | "zh-Hant", Record<StringKey, string>> = { en, zh, "zh-Hant": zhHant };

export function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
  script: Script = "hans"
): string {
  const table = lang === "zh" && script === "hant" ? dict["zh-Hant"] : dict[lang];
  let s = table[key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Pick the right language/script from a trilingual label. */
export function label(l: Label, lang: Lang, script: Script): string {
  return lang === "en" ? l.en : script === "hant" ? l.zt : l.zh;
}

export function useT() {
  const p = useProgress();
  const lang: Lang = p?.settings.uiLang ?? "en";
  const script: Script = p?.settings.script ?? "hans";
  return {
    lang,
    script,
    t: (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars, script),
    /** Label (POS, topic…) in the UI language. */
    tl: (l: Label) => label(l, lang, script),
  };
}
