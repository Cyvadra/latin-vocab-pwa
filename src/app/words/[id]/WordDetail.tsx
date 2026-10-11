"use client";
import Link from "next/link";
import { AudioPair } from "@/components/AudioButton";
import Gate from "@/components/Gate";
import Example from "@/components/Example";
import Gloss from "@/components/Gloss";
import WordExtras from "@/components/WordExtras";
import { formatHeadword } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useProgress } from "@/lib/progress-store";
import { useWords } from "@/lib/words-client";

export default function WordDetail({ id }: { id: number }) {
  const { t, script } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
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
      <WordExtras word={word} />
    </div>
  );
}
