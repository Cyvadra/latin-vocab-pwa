import type { Metadata } from "next";
import { Suspense } from "react";
import { getWordMeta, listWordSlugs } from "@/lib/db";
import { resolveSlug } from "@/lib/slug";
import WordDetail from "./WordDetail";

export function generateStaticParams() {
  return [...listWordSlugs().values()].map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/words/[id]">): Promise<Metadata> {
  const { id } = await params;
  const wid = resolveSlug(id, listWordSlugs());
  const w = wid === null ? null : getWordMeta(wid);
  return w ? { title: w.lemma, description: `${w.lemma}: ${w.en}` } : { title: "Word" };
}

async function Detail({ params }: Pick<PageProps<"/words/[id]">, "params">) {
  const { id } = await params;
  return <WordDetail slug={id} />;
}

export default function WordPage({ params }: PageProps<"/words/[id]">) {
  return (
    <Suspense fallback={<p className="mt-16 text-center text-muted">…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
