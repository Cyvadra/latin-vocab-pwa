"use client";
import Link from "next/link";
import { AudioPair } from "@/components/AudioButton";
import Gate from "@/components/Gate";
import Example from "@/components/Example";
import Gloss from "@/components/Gloss";
import Paradigm from "@/components/Paradigm";
import { formatHeadword } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import type { StringKey } from "@/lib/strings";
import type { Word } from "@/lib/types";
import { useProgress } from "@/lib/progress-store";
import { useWords } from "@/lib/words-client";

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

export default function WordDetail({ id }: { id: number }) {
  const { t, tl, script } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
  const now = useNow();
  if (!data || !progress) return <Gate error={error} />;
  const word = data.byId.get(id);
  const back = (
    <Link href="/words" className="-ml-1 inline-block py-2 text-sm text-accent">
      ‹ {t("backToWords")}
    </Link>
  );
  if (!word) {
    return (
      <div>
        {back}
        <p className="mt-8 text-center text-muted">{t("notFound")}</p>
      </div>
    );
  }
  const { gloss } = progress.settings;
  const card = progress.cards[id];
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
    <div>
      {back}
      <div className="mt-2 rounded-3xl border border-line bg-surface p-6 text-center">
        <h1 className="font-latin text-5xl font-semibold break-words">{word.lemma}</h1>
        <p className="mt-2 font-latin text-lg text-muted">{formatHeadword(word.hw)}</p>
        <div className="mt-4 flex justify-center">
          <AudioPair word={word} size="lg" />
        </div>
        <Gloss word={word} mode={gloss === "zh" ? "zh" : gloss} className="mt-6 text-2xl leading-snug" />
        {gloss !== "both" && (
          <p className="mt-2 text-sm text-muted">{gloss === "en" ? (script === "hant" ? word.zt : word.zh) : word.en}</p>
        )}
      </div>
      {word.ex && (
        <div className="mt-4">
          <Example word={word} gloss={gloss} />
        </div>
      )}
      {word.der && <Derivatives der={word.der} />}
      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <Paradigm word={word} />
    </div>
  );
}
