"use client";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { AudioPair } from "@/components/AudioButton";
import Gate from "@/components/Gate";
import { formatHeadword } from "@/lib/format";
import { label, useT } from "@/lib/i18n";
import { useProgress } from "@/lib/progress-store";
import type { CardState, Word } from "@/lib/types";
import { useWords } from "@/lib/words-client";

type Status = "all" | "new" | "learning" | "known";

function statusOf(c: CardState | undefined): Exclude<Status, "all"> {
  if (!c || c.phase === "new") return "new";
  return c.phase === "review" && c.s >= 21 ? "known" : "learning";
}

const DOT: Record<Exclude<Status, "all">, string> = {
  new: "bg-line",
  learning: "bg-warn",
  known: "bg-good",
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted"
      }`}
    >
      {children}
    </button>
  );
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function WordBrowser() {
  const { t, lang, script } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [pos, setPos] = useState<string>("all");
  const dq = useDeferredValue(q);

  const posList = useMemo(() => {
    const m = new Map<string, string>();
    data?.words.forEach((w) => m.set(w.pos.en, label(w.pos, lang, script)));
    return [...m.entries()];
  }, [data, lang, script]);

  const results = useMemo(() => {
    if (!data || !progress) return [] as Word[];
    const needle = norm(dq.trim());
    return data.words.filter((w) => {
      if (pos !== "all" && w.pos.en !== pos) return false;
      if (status !== "all" && statusOf(progress.cards[w.id]) !== status) return false;
      if (!needle) return true;
      return norm(w.hw).includes(needle) || w.en.toLowerCase().includes(needle) || w.zh.includes(needle) || w.zt.includes(needle);
    });
  }, [data, progress, dq, pos, status]);

  if (!data || !progress) return <Gate error={error} />;
  const { gloss } = progress.settings;
  const zhOf = (w: Word) => (script === "hant" ? w.zt : w.zh);

  return (
    <div>
      <h1 className="sr-only">{t("navWords")}</h1>
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchWords")}
          aria-label={t("searchWords")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {(["all", "new", "learning", "known"] as Status[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? t("filterAll") : s === "new" ? t("statusNew") : s === "learning" ? t("statusLearning") : t("statusKnown")}
            </Chip>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={pos === "all"} onClick={() => setPos("all")}>
            {t("filterAll")}
          </Chip>
          {posList.map(([key, label]) => (
            <Chip key={key} active={pos === key} onClick={() => setPos(key)}>
              {label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted">{t("wordsCount", { n: results.length })}</p>
      </div>

      {results.length === 0 ? (
        <p className="mt-12 text-center text-muted">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {results.map((w) => (
            <li key={w.id} className="flex items-center gap-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_64px]">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[statusOf(progress.cards[w.id])]}`}
                aria-hidden="true"
              />
              <Link href={`/words/${w.id}`} className="min-w-0 flex-1 py-1">
                <p className="truncate font-latin text-lg font-semibold leading-tight">
                  {formatHeadword(w.hw)}
                </p>
                <p className="truncate text-sm text-muted">
                  {gloss === "zh" ? zhOf(w) : gloss === "both" ? `${w.en} · ${zhOf(w)}` : w.en}
                </p>
              </Link>
              <AudioPair word={w} size="sm" short />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
