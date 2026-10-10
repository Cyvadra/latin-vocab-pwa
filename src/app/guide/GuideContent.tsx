"use client";
import Link from "next/link";
import { CONTENT } from "@/lib/guide-content";
import { useT } from "@/lib/i18n";
import { guide as guideHant } from "@/lib/zh-hant.generated";

export default function GuideContent() {
  const { lang, script } = useT();
  const c = lang === "zh" && script === "hant" ? guideHant : CONTENT[lang];
  return (
    <article>
      <Link href="/settings" className="-ml-1 inline-block py-2 text-sm text-accent">
        ‹ {c.back}
      </Link>
      <h1 className="font-latin text-3xl font-semibold">{c.title}</h1>
      {c.blocks.map((b) => (
        <section key={b.h} className="mt-6">
          <h2 className="font-latin text-xl font-semibold">{b.h}</h2>
          {b.p && <p className="mt-2 leading-relaxed text-muted">{b.p}</p>}
          {b.rows && (
            <dl className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
              {b.rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3 text-sm">
                  <dt className="font-latin text-base font-semibold">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </article>
  );
}
