"use client";
import { useMemo } from "react";
import { AudioPair } from "@/components/AudioButton";
import { useT } from "@/lib/i18n";
import { wordMatcher } from "@/lib/morph";
import type { GlossMode, Word } from "@/lib/types";

function Highlighted({ word, text }: { word: Word; text: string }) {
  // building every form of a verb is not free; the card re-renders on each rating hover/tick
  const hit = useMemo(() => wordMatcher(word.hw, word.pos.en, word.detail?.en), [word]);
  return (
    <>
      {text.split(/(\p{L}+)/u).map((part, i) =>
        i % 2 === 1 && hit(part) ? (
          <strong key={i} className="font-semibold text-accent">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

/** Example sentence with translation(s), citation and audio. */
export default function Example({ word, gloss, compact = false }: { word: Word; gloss: GlossMode; compact?: boolean }) {
  const { t, script } = useT();
  const ex = word.ex;
  if (!ex) return null;
  const zh = script === "hant" ? ex.zt : ex.zh;
  const translations = gloss === "both" ? [ex.en, zh] : [gloss === "zh" ? zh : ex.en];
  return (
    <figure className={compact ? "text-left" : "rounded-2xl border border-line bg-surface p-4"}>
      {!compact && <h2 className="mb-2 text-sm font-semibold">{t("exampleTitle")}</h2>}
      <div className="flex items-start gap-3">
        <blockquote className={`flex-1 font-latin leading-snug ${compact ? "text-base" : "text-lg"}`}>
          <Highlighted word={word} text={ex.la} />
        </blockquote>
        <AudioPair word={word} size="sm" short sentence />
      </div>
      <figcaption className="mt-2 text-sm text-muted">
        {translations.map((tr) => (
          <p key={tr}>{tr}</p>
        ))}
        {ex.src && <p className="mt-1 text-xs italic">— {ex.src}</p>}
      </figcaption>
    </figure>
  );
}
