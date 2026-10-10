"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useT, type StringKey } from "@/lib/i18n";
import { useProgress } from "@/lib/progress-store";

const TABS: { href: string; key: StringKey; icon: string; match: (p: string) => boolean }[] = [
  { href: "/", key: "navHome", icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", match: (p) => p === "/" },
  {
    href: "/study",
    key: "navStudy",
    icon: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4 3h8M8 12h8M8 16h5",
    match: (p) => p.startsWith("/study"),
  },
  {
    href: "/words",
    key: "navWords",
    icon: "M4 6h16M4 12h16M4 18h10",
    match: (p) => p.startsWith("/words"),
  },
  {
    href: "/settings",
    key: "navSettings",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2a7.4 7.4 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.4 3a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.4 3h4l.4-3a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z",
    match: (p) => p.startsWith("/settings"),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const progress = useProgress();
  const { t, script } = useT();
  const theme = progress?.settings.theme ?? "system";
  const lang = progress?.settings.uiLang ?? "en";
  // The study screen is full-bleed: hide the tab bar to maximise space and avoid mis-taps.
  const immersive = pathname.startsWith("/study");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? (script === "hant" ? "zh-Hant" : "zh-Hans") : "en";
  }, [lang, script]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Ask the browser not to evict progress under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <main className={`flex-1 px-4 pt-4 ${immersive ? "pb-4" : "pb-24"}`}>{children}</main>
      {!immersive && (
        <nav
          aria-label="Main"
          className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur"
        >
          <ul className="mx-auto flex max-w-xl">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                      active ? "text-accent" : "text-muted"
                    }`}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={tab.icon} />
                    </svg>
                    {t(tab.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
