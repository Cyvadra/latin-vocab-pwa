import type { Metadata } from "next";
import { Suspense } from "react";
import { getWordMeta, listWordIds } from "@/lib/db";
import WordDetail from "./WordDetail";

export function generateStaticParams() {
  return listWordIds().map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: PageProps<"/words/[id]">): Promise<Metadata> {
  const { id } = await params;
  const w = getWordMeta(Number(id));
  return w ? { title: w.lemma, description: `${w.lemma}: ${w.en}` } : { title: "Word" };
}

async function Detail({ params }: Pick<PageProps<"/words/[id]">, "params">) {
  const { id } = await params;
  return <WordDetail id={Number(id)} />;
}

export default function WordPage({ params }: PageProps<"/words/[id]">) {
  return (
    <Suspense fallback={<p className="mt-16 text-center text-muted">…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
