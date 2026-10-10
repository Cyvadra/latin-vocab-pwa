import type { Metadata } from "next";
import WordBrowser from "./WordBrowser";

export const metadata: Metadata = { title: "Words" };

export default function WordsPage() {
  return <WordBrowser />;
}
