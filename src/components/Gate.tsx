"use client";
import { useT } from "@/lib/i18n";

/** Shared loading / error states for pages that need the word list. */
export default function Gate({ error, onRetry }: { error: boolean; onRetry?: () => void }) {
  const { t } = useT();
  if (error) {
    return (
      <div role="alert" className="mt-16 text-center">
        <p className="text-muted">{t("loadError")}</p>
        <button
          onClick={onRetry ?? (() => location.reload())}
          className="mt-4 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink"
        >
          {t("retry")}
        </button>
      </div>
    );
  }
  return (
    <p role="status" className="mt-16 text-center text-muted">
      {t("loading")}
    </p>
  );
}
