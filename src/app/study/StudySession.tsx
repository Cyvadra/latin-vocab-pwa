"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPair } from "@/components/AudioButton";
import Example from "@/components/Example";
import Gate from "@/components/Gate";
import Gloss from "@/components/Gloss";
import WordExtras from "@/components/WordExtras";
import { chosenProns, playWord, primeAudio, stopAudio } from "@/lib/audio";
import { newCard, previewIntervals, type Rating } from "@/lib/fsrs";
import { formatHeadword, hashPick, shortInterval } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { dayKey } from "@/lib/progress-store-pure";
import { reviewCard, useProgress } from "@/lib/progress-store";
import { buildQueue } from "@/lib/queue";
import type { CardFront, Word } from "@/lib/types";
import { useWords } from "@/lib/words-client";

type Face = Exclude<CardFront, "mixed">;

const RATINGS: { rating: Rating; key: "again" | "hard" | "good" | "easy"; style: string }[] = [
  { rating: 1, key: "again", style: "bg-surface-2 text-ink" },
  { rating: 2, key: "hard", style: "bg-surface-2 text-ink" },
  { rating: 3, key: "good", style: "bg-accent text-accent-ink" },
  { rating: 4, key: "easy", style: "bg-surface-2 text-ink" },
];

export default function StudySession() {
  const { data, error } = useWords();
  const progress = useProgress();
  const params = useSearchParams();
  const extra = Math.min(50, Math.max(0, Number(params.get("more")) || 0));

  // Freeze the queue when the session starts so reviews don't reshuffle it.
  const [queue, setQueue] = useState<number[] | null>(null);
  const [initial, setInitial] = useState({ due: 0, fresh: 0 });
  const [started, setStarted] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const now = useNow();
  if (!queue && data && progress && now !== null) {
    // Adjusting state during render: runs once, when the data first becomes available.
    const q = buildQueue(data.words, progress, now, extra);
    setQueue(q.ids);
    setInitial({ due: q.dueCount, fresh: q.newCount });
  }

  if (!data || !progress || !queue) return <Gate error={error} />;

  if (!started && queue.length > 0) {
    return <Intro
        due={initial.due}
        fresh={initial.fresh}
        onStart={() => {
          primeAudio();
          setStarted(true);
        }}
      />;
  }
  if (queue.length === 0) {
    const more = () => {
      primeAudio();
      const q = buildQueue(data.words, progress, now ?? Date.now(), 5);
      setQueue(q.ids);
      setInitial({ due: q.dueCount, fresh: q.newCount });
      setStarted(true);
    };
    return <Done reviewed={reviewed} onMore={more} />;
  }

  return (
    <Running
      key="run"
      queue={queue}
      total={initial.due + initial.fresh}
      words={data.byId}
      reviewed={reviewed}
      onAnswer={(id, rating) => {
        reviewCard(id, rating);
        setReviewed((n) => n + 1);
        setQueue((q) => {
          if (!q) return q;
          const rest = q.slice(1);
          // Failed cards come back a few cards later in the same session.
          if (rating === 1) rest.splice(Math.min(rest.length, 3), 0, id);
          return rest;
        });
      }}
    />
  );
}

function Intro({ due, fresh, onStart }: { due: number; fresh: number; onStart: () => void }) {
  const { t } = useT();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <h1 className="font-latin text-3xl font-semibold">{t("navStudy")}</h1>
      <div className="mt-6 flex gap-10">
        <div>
          <p className="text-4xl font-semibold tabular-nums">{due}</p>
          <p className="text-sm text-muted">{t("dueToday")}</p>
        </div>
        <div>
          <p className="text-4xl font-semibold tabular-nums text-accent">{fresh}</p>
          <p className="text-sm text-muted">{t("newToday")}</p>
        </div>
      </div>
      <button
        onClick={onStart}
        className="mt-10 w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-ink active:opacity-90"
      >
        {t("startStudy")}
      </button>
      <Link href="/" className="mt-4 py-3 text-sm text-muted">
        {t("exit")}
      </Link>
    </div>
  );
}

function Done({ reviewed, onMore }: { reviewed: number; onMore: () => void }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <p className="font-latin text-5xl" aria-hidden="true">
        ✓
      </p>
      <h1 className="mt-4 text-2xl font-semibold">{reviewed > 0 ? t("sessionDone") : t("allDone")}</h1>
      <p className="mt-2 text-muted">{reviewed > 0 ? t("sessionStats", { n: reviewed }) : t("allDoneHint")}</p>
      <button
        onClick={() => router.push("/")}
        className="mt-8 w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-ink"
      >
        {t("backHome")}
      </button>
      <button onClick={onMore} className="mt-3 py-3 text-sm font-medium text-accent">
        {t("learnMore")}
      </button>
    </div>
  );
}

function Running({
  queue,
  total,
  words,
  reviewed,
  onAnswer,
}: {
  queue: number[];
  total: number;
  words: Map<number, Word>;
  reviewed: number;
  onAnswer: (id: number, rating: Rating) => void;
}) {
  const { t, tl } = useT();
  const progress = useProgress()!;
  const { autoplay, front: frontSetting, gloss } = progress.settings;
  const [flipped, setFlipped] = useState(false);
  const id = queue[0];
  const word = words.get(id)!;
  const card = progress.cards[id] ?? newCard(id);

  const face: Face = useMemo(() => {
    if (frontSetting !== "mixed") return frontSetting;
    const faces: Face[] = ["latin", "listen", "meaning"];
    return faces[hashPick(id, Number(dayKey().replaceAll("-", "")), faces.length)];
  }, [frontSetting, id]);

  // Play audio when the card appears (or on reveal for meaning-first cards).
  const lastPlayed = useRef<string>("");
  useEffect(() => {
    if (!autoplay) return;
    const shouldPlay = face === "meaning" ? flipped : true;
    const token = `${id}:${reviewed}:${face === "meaning" ? "back" : "front"}`;
    if (shouldPlay && lastPlayed.current !== token) {
      lastPlayed.current = token;
      void playWord(word, chosenProns()[0]); // with "both", autoplay the first (classical)
    }
  }, [id, reviewed, face, flipped, autoplay, word]);

  useEffect(() => () => stopAudio(), []);

  const rate = useCallback(
    (rating: Rating) => {
      setFlipped(false);
      window.scrollTo(0, 0); // the details under the card may have been scrolled into view
      onAnswer(id, rating);
    },
    [id, onAnswer]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "Enter") {
        if (!flipped) {
          e.preventDefault();
          setFlipped(true);
        }
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key) as Rating);
      } else if (e.key === "r" || e.key === "R") {
        void playWord(word, chosenProns()[0]);
      } else if (e.key === "e" || e.key === "E") {
        void playWord(word, "ecclesiastical");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, rate, word]);

  const clock = useNow();
  const intervals = useMemo(() => previewIntervals(card, clock ?? card.last), [card, clock]);
  const fmt = (d: number) => shortInterval(d, { min: t("min10"), d: t("dayShort"), mo: t("monthShort") });
  const badge =
    card.phase === "new" ? t("newBadge") : card.phase === "learning" ? t("learningBadge") : t("reviewBadge");
  const pct = total > 0 ? Math.min(100, (reviewed / (reviewed + queue.length)) * 100) : 0;
  const showLatin = face !== "listen" || flipped;
  const showMeaning = face === "meaning" || flipped;
  const prompt =
    face === "listen" && !flipped ? t("listenFront") : face === "meaning" && !flipped ? t("meaningFront") : null;

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex items-center gap-3 pb-3">
        <Link href="/" onClick={() => stopAudio()} aria-label={t("exit")} className="-ml-2 p-2 text-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t("progressTitle")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="min-w-8 text-right text-sm tabular-nums text-muted">{queue.length}</span>
      </div>

      <div
        onClick={() => !flipped && setFlipped(true)}
        className="relative flex flex-1 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-6 text-center shadow-sm"
      >
        <span className="absolute left-4 top-4 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          {badge}
        </span>
        <span className="absolute right-4 top-4 text-xs text-muted">
          {tl(word.pos)}
          {word.detail ? ` · ${tl(word.detail)}` : ""}
        </span>

        {prompt && <p className="mb-5 text-sm text-muted">{prompt}</p>}

        {face === "listen" && !flipped ? (
          <AudioPair word={word} size="lg" />
        ) : null}

        {showLatin && (
          <div>
            <h1 className="font-latin text-5xl font-semibold leading-tight break-words">{word.lemma}</h1>
            {word.hw !== word.lemma && (
              <p className="mt-2 font-latin text-lg text-muted">{formatHeadword(word.hw)}</p>
            )}
            <div className="mt-4 flex justify-center">
              <AudioPair word={word} />
            </div>
          </div>
        )}

        {showMeaning && (
          <div className={face === "meaning" ? "" : "mt-6 w-full border-t border-line pt-6"}>
            <Gloss word={word} mode={gloss} className="text-2xl leading-snug" />
            {flipped && (
              <p className="mt-4 text-xs text-muted">
                {word.group ? `${tl(word.group)} · ` : ""}
                {t("rank")} #{word.rank}
              </p>
            )}
            {flipped && word.ex && (
              <div className="mt-5 w-full border-t border-line pt-4">
                <Example word={word} gloss={gloss} compact />
              </div>
            )}
          </div>
        )}

        {!flipped && <p className="absolute bottom-4 text-xs text-muted">{t("tapToFlip")}</p>}
      </div>

      {flipped && (
        <div className="pb-2">
          <WordExtras word={word} />
        </div>
      )}

      <div className="safe-bottom sticky bottom-0 bg-bg pt-4 pb-2">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.rating}
                onClick={() => rate(r.rating)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-base font-semibold active:scale-95 ${r.style}`}
              >
                {t(r.key)}
                <span className="text-xs font-normal opacity-90">{fmt(intervals[r.rating])}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-ink active:opacity-90"
          >
            {t("showAnswer")}
          </button>
        )}
      </div>
    </div>
  );
}
