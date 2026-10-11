"use client";
import { useMemo } from "react";
import { chosenProns, playForm } from "@/lib/audio";
import { useT } from "@/lib/i18n";
import { isInvariable, isSingleForm, paradigm, type FormTable } from "@/lib/morph";
import type { Word } from "@/lib/types";

/** A table cell: each single-word alternative ("domuī/domō") can be tapped to hear it. */
function FormCell({ cell }: { cell: string }) {
  const { t } = useT();
  const parts = cell.split("/");
  return parts.map((f, i) => (
    <span key={i}>
      {i > 0 && "/"}
      {!isSingleForm(f.trim()) ? (
        f // gaps and periphrastic forms ("amātus sum") have no single recording
      ) : (
        <button
          type="button"
          onClick={() => void playForm(f, chosenProns()[0])}
          aria-label={`${t("playAudio")}: ${f}`}
          className="rounded text-left underline decoration-line decoration-dotted underline-offset-4 active:text-accent"
        >
          {f}
        </button>
      )}
    </span>
  ));
}

function Table({ table }: { table: FormTable }) {
  const { t } = useT();
  return (
    <div>
      {table.title && <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t(table.title)}</h4>}
      <table className="w-full table-fixed text-sm">
        {table.cols.length > 0 && (
          <thead>
            <tr className="text-xs text-muted">
              <th className="w-20" />
              {table.cols.map((c) => (
                <th key={c} className="px-1 pb-1 text-left font-normal">
                  {t(c)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <th scope="row" className="w-20 py-1 pr-2 text-left text-xs font-normal whitespace-nowrap text-muted">
                {t(r.label)}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className="px-1 py-1 font-latin break-words">
                  <FormCell cell={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Declension / conjugation tables generated from the dictionary entry. Renders nothing if unsupported. */
export default function Paradigm({ word }: { word: Word }) {
  const { t } = useT();
  const sections = useMemo(() => paradigm(word.hw, word.pos.en, word.detail?.en), [word]);
  const detail = word.detail?.en;
  if (!sections) {
    // say so for words that don't inflect, rather than showing nothing
    if (!isInvariable(word.hw, detail)) return null;
    return <p className="mt-4 px-1 text-sm text-muted">{t("formsIndeclinable")}</p>;
  }
  return (
    <section className="mt-4">
      <h2 className="mb-2 px-1 text-sm font-semibold">{t("formsTitle")}</h2>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {sections.map((s, i) => (
          <details key={s.title} open={i === 0} className="group px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium select-none">{t(s.title)}</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {s.tables.map((tb, j) => (
                <Table key={j} table={tb} />
              ))}
            </div>
          </details>
        ))}
      </div>
      {detail === "impersonal" && <p className="mt-2 px-1 text-xs text-muted">{t("formsImpersonal")}</p>}
      <p className="mt-2 px-1 text-xs text-muted">{t("formsTapHint")} {t("formsNote")}</p>
    </section>
  );
}
