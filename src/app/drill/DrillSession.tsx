"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { drillPool, makeSession, type Question } from "@/lib/drill";
import { useT } from "@/lib/i18n";
import { useProgress } from "@/lib/progress-store";
import type { StringKey } from "@/lib/strings";
import { useWords } from "@/lib/words-client";

const ROUND = 10;

function Option({
  children,
  state,
  onClick,
}: {
  children: React.ReactNode;
  state: "idle" | "right" | "wrong" | "dim";
  onClick?: () => void;
}) {
  const tone = {
    idle: "border-line bg-surface active:bg-surface-2",
    right: "border-good bg-good/10 font-medium",
    wrong: "border-accent bg-accent-soft",
    dim: "border-line bg-surface opacity-50",
  }[state];
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${tone}`}
    >
      {children}
    </button>
  );
}

export default function DrillSession() {
  const { t, tl } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
  const [round, setRound] = useState<{ questions: Question[]; beginner: boolean } | null>(null);
  const [i, setI] = useState(0);
  const [wordPick, setWordPick] = useState<number | null>(null);
  const [formPick, setFormPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const start = () => {
    if (!data || !progress) return;
    const { pool, beginner } = drillPool(data.words, progress);
    setRound({ questions: makeSession(pool, ROUND), beginner });
    setI(0);
    setWordPick(null);
    setFormPick(null);
    setScore(0);
  };
  // questions are random, so build them on the client after mount (never during render)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => start(), [!!data, !!progress]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !progress || !round) return <Gate error={error} />;
  const parse = (p: StringKey[]) => p.map((k) => t(k)).join(" · ");
  const { questions, beginner } = round;

  if (i >= questions.length) {
    return (
      <div className="pt-10 text-center">
        <h1 className="text-2xl font-semibold">{t("drillDone")}</h1>
        <p className="mt-2 text-muted">{t("drillScore", { n: score, total: questions.length })}</p>
        <button
          type="button"
          onClick={start}
          className="mt-8 w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-ink active:opacity-90"
        >
          {t("drillAgain")}
        </button>
        <Link href="/" className="mt-4 inline-block py-2 text-sm text-accent">
          {t("backHome")}
        </Link>
      </div>
    );
  }

  const q = questions[i];
  const wordRight = wordPick !== null && q.words[wordPick].id === q.word.id;
  const next = () => {
    if (wordRight && formPick === q.answer) setScore((s) => s + 1);
    setI(i + 1);
    setWordPick(null);
    setFormPick(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/" className="-ml-1 p-2 text-muted" aria-label={t("exit")}>
          ✕
        </Link>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="min-w-8 text-right text-sm tabular-nums text-muted">
          {i + 1}/{questions.length}
        </span>
      </div>
      {beginner && i === 0 && <p className="text-sm text-muted">{t("drillBeginnerHint")}</p>}

      <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-sm">
        <h1 className="font-latin text-5xl font-semibold break-words">{q.form}</h1>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">{t("drillWhichWord")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {q.words.map((w, k) => (
            <Option
              key={w.id}
              state={
                wordPick === null ? "idle" : w.id === q.word.id ? "right" : k === wordPick ? "wrong" : "dim"
              }
              onClick={wordPick === null ? () => setWordPick(k) : undefined}
            >
              <span className="font-latin text-lg">{w.lemma}</span>
              {wordPick !== null && <span className="line-clamp-2 block text-xs text-muted">{tl({ en: w.en, zh: w.zh, zt: w.zt })}</span>}
            </Option>
          ))}
        </div>
      </section>

      {wordPick !== null && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">{t("drillWhichForm")}</h2>
          <div className="space-y-2">
            {q.parses.map((p, k) => (
              <Option
                key={k}
                state={formPick === null ? "idle" : k === q.answer ? "right" : k === formPick ? "wrong" : "dim"}
                onClick={formPick === null ? () => setFormPick(k) : undefined}
              >
                <span className="text-sm">{parse(p)}</span>
              </Option>
            ))}
          </div>
        </section>
      )}

      {formPick !== null && (
        <div className="space-y-3">
          <p className="text-center text-sm">
            <Link href={`/words/${q.word.id}`} className="text-accent">
              {t("drillSeeTable", { word: q.word.lemma })} ›
            </Link>
          </p>
          <button
            type="button"
            autoFocus
            onClick={next}
            className="w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-ink active:opacity-90"
          >
            {t("drillNext")}
          </button>
        </div>
      )}
    </div>
  );
}
