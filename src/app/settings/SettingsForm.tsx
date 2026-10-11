"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Gate from "@/components/Gate";
import { useT, type StringKey } from "@/lib/i18n";
import { SPEECH_RATES } from "@/lib/audio";
import { downloadAudio } from "@/lib/offline";
import { dayKey } from "@/lib/progress-store-pure";
import { exportProgress, importProgress, resetProgress, updateSettings, useProgress } from "@/lib/progress-store";
import type { Settings } from "@/lib/types";
import { useWords } from "@/lib/words-client";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-base">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-sm ${value === o.value ? "bg-accent text-accent-ink" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="divide-y divide-line">
      <p className="px-4 pb-1 pt-3 text-sm text-muted" aria-hidden="true">
        {label}
      </p>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-base">{o.label}</span>
            {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
          </span>
          <span
            className={`h-5 w-5 shrink-0 rounded-full border-2 ${
              value === o.value ? "border-accent bg-accent shadow-[inset_0_0_0_3px_var(--surface)]" : "border-line"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function SettingsForm() {
  const { t } = useT();
  const progress = useProgress();
  const { data, error } = useWords();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>("");
  const [dl, setDl] = useState<number | null>(null);

  if (!progress) return <Gate error={error} />;
  const s = progress.settings;
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);

  const onExport = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `latin-progress-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm(t("importConfirm"))) return;
    const err = importProgress(await file.text());
    setMsg(err ? t("importBad") : t("importOk"));
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDownload = async () => {
    if (!data) return;
    setDl(0);
    setMsg("");
    try {
      await downloadAudio(data.words, s, setDl);
      setMsg(t("downloadDone"));
    } catch {
      setMsg(t("downloadFail"));
    }
    setDl(null);
  };

  const btn = "rounded-full border border-line bg-surface-2 px-4 py-2 text-sm font-medium";

  return (
    <div>
      <h1 className="pt-2 font-latin text-3xl font-semibold">{t("settingsTitle")}</h1>

      <Section title={t("secLanguage")}>
        <Row label={t("uiLanguage")}>
          <Segmented
            label={t("uiLanguage")}
            value={s.uiLang}
            onChange={set("uiLang")}
            options={[
              { value: "en", label: "English" },
              { value: "zh", label: "中文" },
            ]}
          />
        </Row>
        <Row label={t("glossLanguage")}>
          <Segmented
            label={t("glossLanguage")}
            value={s.gloss}
            onChange={set("gloss")}
            options={[
              { value: "en", label: t("glossEn") },
              { value: "zh", label: t("glossZh") },
              { value: "both", label: t("glossBoth") },
            ]}
          />
        </Row>
        {(s.uiLang === "zh" || s.gloss !== "en") && (
          <Row label={t("chineseScript")}>
            <Segmented
              label={t("chineseScript")}
              value={s.script}
              onChange={set("script")}
              options={[
                { value: "hans", label: "简体" },
                { value: "hant", label: "繁體" },
              ]}
            />
          </Row>
        )}
      </Section>

      <Section title={t("secAudio")}>
        <Choice
          label={t("pronunciation")}
          value={s.pron}
          onChange={set("pron")}
          options={[
            { value: "classical", label: t("classical"), hint: t("classicalHint") },
            { value: "ecclesiastical", label: t("ecclesiastical"), hint: t("ecclesiasticalHint") },
            { value: "both", label: t("pronBoth"), hint: t("pronBothHint") },
          ]}
        />
        {s.pron !== "ecclesiastical" && (
          <Choice
            label={t("classicalVoice")}
            value={s.classicalVoice}
            onChange={set("classicalVoice")}
            options={[
              { value: "neural", label: t("voiceNeural"), hint: t("voiceNeuralHint") },
              { value: "phonetic", label: t("voicePhonetic"), hint: t("voicePhoneticHint") },
            ]}
          />
        )}
        <Link href="/guide" className="flex items-center justify-between px-4 py-3 text-accent">
          {t("guideLink")}
          <span aria-hidden="true">›</span>
        </Link>
        <Row label={t("autoplay")}>
          <input
            type="checkbox"
            checked={s.autoplay}
            onChange={(e) => set("autoplay")(e.target.checked)}
            className="h-6 w-6 accent-[var(--accent)]"
            aria-label={t("autoplay")}
          />
        </Row>
        <Row label={t("speechRate")}>
          <select
            value={String(s.speechRate)}
            onChange={(e) => set("speechRate")(Number(e.target.value))}
            className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm"
            aria-label={t("speechRate")}
          >
            {SPEECH_RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title={t("secStudy")}>
        <Row label={t("newPerDay")}>
          <div className="flex items-center gap-3">
            <button className={btn} aria-label="−" onClick={() => set("newPerDay")(Math.max(1, s.newPerDay - 5))}>
              −
            </button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">{s.newPerDay}</span>
            <button className={btn} aria-label="+" onClick={() => set("newPerDay")(Math.min(100, s.newPerDay + 5))}>
              +
            </button>
          </div>
        </Row>
        <Choice
          label={t("cardFront")}
          value={s.front}
          onChange={set("front")}
          options={[
            { value: "latin", label: t("frontLatin") },
            { value: "listen", label: t("frontListen") },
            { value: "meaning", label: t("frontMeaning") },
            { value: "mixed", label: t("frontMixed") },
          ]}
        />
      </Section>

      <Section title={t("secAppearance")}>
        <Row label={t("theme")}>
          <Segmented
            label={t("theme")}
            value={s.theme}
            onChange={set("theme")}
            options={(["system", "light", "dark"] as const).map((v) => ({
              value: v,
              label: t(`theme${v[0].toUpperCase()}${v.slice(1)}` as StringKey),
            }))}
          />
        </Row>
      </Section>

      <Section title={t("secOffline")}>
        <div className="px-4 py-3">
          <p className="text-sm text-muted">{t("offlineHint")}</p>
          <button className={`${btn} mt-3`} onClick={onDownload} disabled={dl !== null || !data}>
            {dl === null ? t("downloadAudio") : t("downloading", { n: Math.round(dl * 100) })}
          </button>
        </div>
      </Section>

      <Section title={t("secData")}>
        <div className="px-4 py-3">
          <p className="text-sm text-muted">{t("dataHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} onClick={onExport}>
              {t("exportData")}
            </button>
            <button className={btn} onClick={() => fileRef.current?.click()}>
              {t("importData")}
            </button>
            <button
              className={`${btn} text-accent`}
              onClick={() => {
                if (confirm(t("resetConfirm"))) {
                  resetProgress();
                  setMsg(t("resetDone"));
                }
              }}
            >
              {t("resetData")}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
        </div>
      </Section>

      {msg && (
        <p role="status" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {msg}
        </p>
      )}

      <Section title={t("secAbout")}>
        <p className="px-4 py-3 text-sm text-muted">{t("aboutText")}</p>
      </Section>
    </div>
  );
}
