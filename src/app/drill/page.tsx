import { Suspense } from "react";
import type { Metadata } from "next";
import DrillSession from "./DrillSession";

export const metadata: Metadata = { title: "Form drill" };

export default function DrillPage() {
  return (
    <Suspense>
      <DrillSession />
    </Suspense>
  );
}
