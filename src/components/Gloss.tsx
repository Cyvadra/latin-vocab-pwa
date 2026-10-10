"use client";
import { useT } from "@/lib/i18n";
import type { GlossMode, Word } from "@/lib/types";

/** Meaning(s) of a word in the learner's chosen language(s) and Chinese script. */
export default function Gloss({
  word,
  mode,
  className = "",
}: {
  word: Word;
  mode: GlossMode;
  className?: string;
}) {
  const { script } = useT();
  const zh = script === "hant" ? word.zt : word.zh;
  if (mode === "both") {
    return (
      <div className={className}>
        <p>{word.en}</p>
        <p className="mt-1 text-[0.9em] text-muted">{zh}</p>
      </div>
    );
  }
  return <p className={className}>{mode === "zh" ? zh : word.en}</p>;
}
