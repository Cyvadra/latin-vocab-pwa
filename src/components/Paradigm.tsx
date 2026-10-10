"use client";
import { useT } from "@/lib/i18n";
import { paradigm, type FormTable } from "@/lib/morph";
import type { Word } from "@/lib/types";

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
                  {c}
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
  const sections = paradigm(word.hw, word.pos.en, word.detail?.en);
  if (!sections) return null;
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
      <p className="mt-2 px-1 text-xs text-muted">{t("formsNote")}</p>
    </section>
  );
}
