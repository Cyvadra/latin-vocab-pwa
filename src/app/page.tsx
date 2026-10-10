"use client";
import Link from "next/link";
import { useMemo } from "react";
import Gate from "@/components/Gate";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { currentStreak, updateSettings, useProgress } from "@/lib/progress-store";
import { buildQueue } from "@/lib/queue";
import { computeStats } from "@/lib/stats";
import { useWords } from "@/lib/words-client";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function Home() {
  const { t } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
  const now = useNow();

  const view = useMemo(() => {
    if (!progress || !data || now === null) return null;
    return {
      queue: buildQueue(data.words, progress, now),
      stats: computeStats(progress, now),
      streak: currentStreak(progress.log, now),
      total: data.words.length,
      started: Object.keys(progress.cards).length > 0,
    };
  }, [progress, data, now]);

  if (!view) return <Gate error={error} />;
  const { queue, stats, streak, total, started } = view;
  const max = Math.max(1, ...stats.last7.map((d) => d.reviews));
  const remaining = queue.ids.length;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="font-latin text-3xl font-semibold">{t("welcome")}</h1>
        <p className="mt-1 text-sm text-muted">{t("tagline")}</p>
      </header>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        {remaining > 0 ? (
          <>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-4xl font-semibold tabular-nums">{queue.dueCount}</p>
                <p className="text-sm text-muted">{t("dueToday")}</p>
              </div>
              <div>
                <p className="text-4xl font-semibold tabular-nums text-accent">{queue.newCount}</p>
                <p className="text-sm text-muted">{t("newToday")}</p>
              </div>
            </div>
            <Link
              href="/study"
              className="mt-5 block rounded-full bg-accent py-4 text-center text-lg font-semibold text-accent-ink active:opacity-90"
            >
              {started ? t("continueStudy") : t("startStudy")}
            </Link>
            {!started && <p className="mt-3 text-sm text-muted">{t("firstTimeHint")}</p>}
          </>
        ) : (
          <>
            <p className="text-xl font-semibold">{t("allDone")}</p>
            <p className="mt-1 text-sm text-muted">{t("allDoneHint")}</p>
            <Link
              href="/study?more=5"
              className="mt-4 block rounded-full border border-accent py-3.5 text-center font-semibold text-accent"
            >
              {t("learnMore")}
            </Link>
          </>
        )}
      </section>

      {!started && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-medium text-muted">{t("firstRunTitle")}</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">{t("uiLanguage")}</span>
            <div className="flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label={t("uiLanguage")}>
              {(["en", "zh"] as const).map((l) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={progress!.settings.uiLang === l}
                  onClick={() => updateSettings({ uiLang: l, gloss: l === "zh" ? "both" : "en" })}
                  className={`rounded-full px-3 py-1.5 text-sm ${progress!.settings.uiLang === l ? "bg-accent text-accent-ink" : "text-muted"}`}
                >
                  {l === "en" ? "English" : "中文"}
                </button>
              ))}
            </div>
          </div>
          {progress!.settings.uiLang === "zh" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">{t("chineseScript")}</span>
              <div className="flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label={t("chineseScript")}>
                {(["hans", "hant"] as const).map((sc) => (
                  <button
                    key={sc}
                    role="radio"
                    aria-checked={progress!.settings.script === sc}
                    onClick={() => updateSettings({ script: sc })}
                    className={`rounded-full px-3 py-1.5 text-sm ${progress!.settings.script === sc ? "bg-accent text-accent-ink" : "text-muted"}`}
                  >
                    {sc === "hans" ? "简体" : "繁體"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Link href="/guide" className="mt-3 inline-block text-sm text-accent">
            {t("guideLink")} ›
          </Link>
        </section>
      )}

      <section aria-label={t("progressTitle")} className="grid grid-cols-2 gap-3">
        <Stat label={t("streak")} value={streak} />
        <Stat label={t("learned")} value={`${stats.learned} ${t("of")} ${total}`} />
        <Stat label={t("mature")} value={stats.mature} />
        <Stat label={t("accuracy")} value={stats.accuracy7 === null ? "—" : `${stats.accuracy7}%`} />
      </section>

      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={stats.learned}
        aria-label={t("learned")}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${(stats.learned / total) * 100}%` }} />
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">{t("last7")}</h2>
        <div className="mt-3 flex h-24 items-end gap-2">
          {stats.last7.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-md bg-accent/80"
                style={{ height: `${Math.max(4, (d.reviews / max) * 100)}%`, opacity: d.reviews ? 1 : 0.25 }}
                title={`${d.key}: ${d.reviews} ${t("reviewsShort")}`}
              />
              <span className="text-[10px] text-muted">{d.key.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
