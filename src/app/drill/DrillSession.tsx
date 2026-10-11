"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Gate from "@/components/Gate";
import Paradigm from "@/components/Paradigm";
import { chosenProns, playForm, stopAudio } from "@/lib/audio";
import { makeRound, type Question } from "@/lib/drill";
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
  // aria-disabled rather than disabled: the picked button keeps focus after answering
  return (
    <button
      type="button"
      aria-disabled={!onClick}
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-2xl border px-4 py-3 text-left transition ${tone}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {/* colour alone can't tell right from wrong */}
      {(state === "right" || state === "wrong") && (
        <span aria-hidden className={state === "right" ? "text-good" : "text-accent"}>
          {state === "right" ? "✓" : "✗"}
        </span>
      )}
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
    stopAudio();
    window.scrollTo(0, 0);
    setRound(makeRound(data.words, progress, ROUND));
    setI(0);
    setWordPick(null);
    setFormPick(null);
    setScore(0);
  };
  // questions are random, so build them on the client after mount (never during render)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => start(), [!!data, !!progress]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAudio(), []);

  // bring each newly revealed step into view, and give focus somewhere sensible on a new question
  const formsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (wordPick !== null) formsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [wordPick]);
  useEffect(() => {
    if (i > 0) formRef.current?.focus();
  }, [i]);

  if (!data || !progress || !round) return <Gate error={error} />;
  const parse = (p: StringKey[]) => p.map((k) => t(k)).join(" · ");
  const { questions, beginner } = round;

  if (i >= questions.length) {
    return (
      <div className="pt-10 text-center">
        <h1 className="text-2xl font-semibold">{t(questions.length ? "drillDone" : "drillEmpty")}</h1>
        {questions.length > 0 && <p className="mt-2 text-muted">{t("drillScore", { n: score, total: questions.length })}</p>}
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
  // announced to screen readers after each pick
  const feedback =
    formPick !== null
      ? `${t(formPick === q.answer ? "drillRight" : "drillWrong")} ${parse(q.parses[q.answer])}`
      : wordPick !== null
        ? `${t(wordRight ? "drillRight" : "drillWrong")} ${q.word.lemma}`
        : "";
  const next = () => {
    if (wordRight && formPick === q.answer) setScore((s) => s + 1);
    stopAudio();
    window.scrollTo(0, 0);
    setI(i + 1);
    setWordPick(null);
    setFormPick(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/" onClick={() => stopAudio()} className="-ml-1 p-2 text-muted" aria-label={t("exit")}>
          ✕
        </Link>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t("progressTitle")}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={i}
        >
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="min-w-8 text-right text-sm tabular-nums text-muted">
          {i + 1}/{questions.length}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {feedback}
      </p>
      {beginner && i === 0 && <p className="text-sm text-muted">{t("drillBeginnerHint")}</p>}

      <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-sm">
        <h1 ref={formRef} tabIndex={-1} className="font-latin text-5xl font-semibold break-words outline-none">
          {q.form}
        </h1>
        <button
          type="button"
          onClick={() => void playForm(q.form, chosenProns()[0])}
          className="mt-3 rounded-full bg-accent-soft px-4 py-2 text-sm text-accent active:scale-95"
        >
          {t("playAudio")}
        </button>
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
        <section ref={formsRef} className="scroll-mb-4">
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
          {/* shown in place: leaving the page would lose the round */}
          <details className="rounded-2xl border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm text-accent">{t("drillSeeTable", { word: q.word.lemma })}</summary>
            <Paradigm word={q.word} />
          </details>
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
