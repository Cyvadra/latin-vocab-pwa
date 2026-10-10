import { Suspense } from "react";
import type { Metadata } from "next";
import StudySession from "./StudySession";

export const metadata: Metadata = { title: "Study" };

export default function StudyPage() {
  return (
    <Suspense>
      <StudySession />
    </Suspense>
  );
}
