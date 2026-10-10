"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { playWord } from "@/lib/audio";
import type { Pronunciation, Word } from "@/lib/types";

export default function AudioButton({
  word,
  pron,
  size = "md",
  className = "",
}: {
  word: Word;
  pron: Pronunciation;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useT();
  const [playing, setPlaying] = useState(false);
  const dim = size === "lg" ? "h-20 w-20" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "lg" ? 34 : size === "md" ? 24 : 20;

  return (
    <button
      type="button"
      aria-label={t("playAudio")}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
        void playWord(word, pron).finally(() => setTimeout(() => setPlaying(false), 600));
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
}
