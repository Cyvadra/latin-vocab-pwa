import type { Metadata } from "next";
import GuideContent from "./GuideContent";

export const metadata: Metadata = { title: "Guide" };

export default function GuidePage() {
  return <GuideContent />;
}
