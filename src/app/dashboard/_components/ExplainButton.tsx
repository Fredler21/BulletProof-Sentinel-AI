"use client";

import { useState } from "react";
import type { ThreatExplanation } from "@/lib/types";

export function ExplainButton({
  eventId,
}: {
  eventId: string;
}): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<ThreatExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh: boolean): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, refresh }),
      });
      const json = (await res.json()) as {
        explanation?: ThreatExplanation;
        error?: string;
      };
      if (!res.ok || !json.explanation) {
        throw new Error(json.error ?? "Failed to load explanation");
      }
      setData(json.explanation);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => (open ? setOpen(false) : void load(false))}
        disabled={loading}
        className="rounded-md border border-sentinel-accent/60 bg-sentinel-accent/10 px-3 py-1.5 text-xs text-sentinel-accent hover:bg-sentinel-accent/20 disabled:opacity-60"
      >
        {loading ? "Analyzing…" : open ? "Hide AI" : "Explain with AI"}
      </button>
      {open && (
        <div className="rounded-lg border border-sentinel-border bg-sentinel-bg p-3 text-xs text-slate-200">
          {error && <p className="text-sentinel-danger">{error}</p>}
          {data && (
            <div className="space-y-2">
              <p className="text-slate-100">{data.summary}</p>
              <p className="text-sentinel-muted">{data.whyItMatters}</p>
              {data.recommendedActions.length > 0 && (
                <div>
                  <p className="font-semibold text-sentinel-accent">
                    Recommended actions
                  </p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    {data.recommendedActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.mitre.length > 0 && (
                <div>
                  <p className="font-semibold text-sentinel-accent">
                    MITRE ATT&amp;CK
                  </p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    {data.mitre.map((m) => (
                      <li key={`${m.tacticId}-${m.techniqueId}`}>
                        <span className="font-mono">{m.tacticId}</span>{" "}
                        {m.tacticName} →{" "}
                        <span className="font-mono">{m.techniqueId}</span>{" "}
                        {m.techniqueName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-sentinel-muted">
                  model: {data.model}
                </span>
                <button
                  onClick={() => void load(true)}
                  className="text-[10px] text-sentinel-accent hover:underline"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
