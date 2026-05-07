"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[dashboard.error]", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-sentinel-danger/40 bg-sentinel-panel p-6">
      <h2 className="text-lg font-semibold text-sentinel-danger">
        Something went wrong loading this page
      </h2>
      <p className="mt-2 text-sm text-sentinel-muted">
        The page failed to render server-side. The dashboard is still online —
        try again, or jump to a different section.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-sentinel-muted">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-sentinel-accent/40 px-3 py-1.5 text-xs text-sentinel-accent hover:bg-sentinel-accent/10"
        >
          Retry
        </button>
        <a
          href="/dashboard/live"
          className="rounded border border-sentinel-border px-3 py-1.5 text-xs text-slate-200 hover:border-sentinel-accent"
        >
          Open Live Console
        </a>
      </div>
    </div>
  );
}
