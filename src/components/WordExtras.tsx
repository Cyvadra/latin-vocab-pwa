"use client";
import Paradigm from "@/components/Paradigm";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { useProgress } from "@/lib/progress-store";
import type { StringKey } from "@/lib/strings";
import type { Word } from "@/lib/types";

const ROMANCE = { it: "derivativesIt", es: "derivativesEs", fr: "derivativesFr" } as const satisfies Record<string, StringKey>;

function Derivatives({ der }: { der: NonNullable<Word["der"]> }) {
  const { t } = useT();
  const rows: [StringKey, string][] = [
    ...(der.en ? ([["derivativesEn", der.en.join(", ")]] as [StringKey, string][]) : []),
    ...(["it", "es", "fr"] as const)
      .filter((k) => der[k])
      .map((k): [StringKey, string] => [ROMANCE[k], der[k]!]),
  ];
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold">{t("derivativesTitle")}</h2>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted">{t(k)}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Everything below the headword card: derivatives, facts and review state, and the form tables.
 * `facts={false}` (study) leaves out the facts table: the card already shows them, and its review
 * row would contradict the rating buttons' intervals.
 */
export default function WordExtras({ word, facts = true }: { word: Word; facts?: boolean }) {
  const { t, tl } = useT();
  const progress = useProgress();
  const now = useNow();
  const id = word.id;
  const card = progress?.cards[id];
  const rows: [string, string][] = [
    [t("partOfSpeech"), tl(word.pos) + (word.detail ? ` · ${tl(word.detail)}` : "")],
    ...(word.group ? ([[t("topic"), tl(word.group)]] as [string, string][]) : []),
    [t("rank"), `#${word.rank}`],
  ];
  if (card && card.phase !== "new") {
    const days = Math.round((card.due - (now ?? card.due)) / 86_400_000);
    rows.push([t("nextReview"), days <= 0 ? t("today") : t("inDays", { n: days })]);
    rows.push([t("reviewsDone"), String(card.reps)]);
    rows.push([t("lapses"), String(card.lapses)]);
  } else {
    rows.push([t("nextReview"), t("notStudied")]);
  }

  return (
    <>
      {word.der && <Derivatives der={word.der} />}
      {facts && (
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Paradigm word={word} />
    </>
  );
}
