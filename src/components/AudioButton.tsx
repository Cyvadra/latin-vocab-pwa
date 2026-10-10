"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { playSentence, playWord } from "@/lib/audio";
import type { Pronunciation, Word } from "@/lib/types";

export default function AudioButton({
  word,
  pron,
  size = "md",
  caption,
  sentence = false,
  className = "",
}: {
  word: Word;
  pron: Pronunciation;
  /** Play the word's example sentence instead of the word */
  sentence?: boolean;
  /** Short visible label under the button (e.g. "Classical") */
  caption?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useT();
  const [playing, setPlaying] = useState(false);
  const dim = size === "lg" ? "h-20 w-20" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "lg" ? 34 : size === "md" ? 24 : 20;

  const button = (
    <button
      type="button"
      aria-label={`${t(sentence ? "playSentence" : "playAudio")} (${t(pron)})`}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
        void (sentence ? playSentence : playWord)(word, pron).finally(() => setTimeout(() => setPlaying(false), 600));
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition active:scale-95 ${dim} ${
        playing ? "ring-2 ring-accent" : ""
      } ${className}`}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.8V6.2a1 1 0 0 0-1.7-.8L7 9H4a1 1 0 0 0-1 1z" />
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
  if (!caption) return button;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {button}
      <span className="text-xs text-muted" aria-hidden="true">
        {caption}
      </span>
    </span>
  );
}

/** Both pronunciations side by side; the learner never has to choose one in settings. */
export function AudioPair({
  word,
  size = "md",
  short = false,
  sentence = false,
}: {
  word: Word;
  size?: "sm" | "md" | "lg";
  short?: boolean;
  sentence?: boolean;
}) {
  const { t } = useT();
  return (
    <span className={`inline-flex items-start ${size === "sm" ? "gap-2" : "gap-5"}`}>
      {(["classical", "ecclesiastical"] as const).map((pr) => (
        <AudioButton key={pr} word={word} pron={pr} size={size} sentence={sentence} caption={t(short ? `${pr}Short` : pr)} />
      ))}
    </span>
  );
}
