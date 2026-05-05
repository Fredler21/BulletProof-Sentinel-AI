"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IncidentReportScope } from "@/lib/types";

export function GenerateReportButton(): React.ReactElement {
  const router = useRouter();
  const [scope, setScope] = useState<IncidentReportScope>("executive");
  const [hours, setHours] = useState<number>(24);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function go(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, hours }),
      });
      const data = (await res.json()) as {
        report?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.report) {
        throw new Error(data.error ?? "Failed to generate");
      }
      router.push(`/dashboard/reports/${data.report.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sentinel-border bg-sentinel-panel p-3">
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as IncidentReportScope)}
        className="rounded-md border border-sentinel-border bg-sentinel-bg px-2 py-1.5 text-xs text-slate-100"
      >
        <option value="executive">Executive</option>
        <option value="technical">Technical</option>
      </select>
      <select
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="rounded-md border border-sentinel-border bg-sentinel-bg px-2 py-1.5 text-xs text-slate-100"
      >
        <option value={1}>Last 1h</option>
        <option value={24}>Last 24h</option>
        <option value={168}>Last 7d</option>
        <option value={720}>Last 30d</option>
      </select>
      <button
        onClick={go}
        disabled={busy}
        className="rounded-md bg-sentinel-accent px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
      >
        {busy ? "Generating…" : "Generate report"}
      </button>
      {error && (
        <p className="w-full text-[11px] text-sentinel-danger">{error}</p>
      )}
    </div>
  );
}
