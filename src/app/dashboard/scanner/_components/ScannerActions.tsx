"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Asset } from "@/lib/types";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";

export function ScannerActions({
  assets,
}: {
  assets: Asset[];
}): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addAsset(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy("add");
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Failed to add asset");
      }
      setName("");
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setBusy(null);
    }
  }

  async function scan(assetId: string): Promise<void> {
    setError(null);
    setBusy(`scan:${assetId}`);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Scan failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(assetId: string): Promise<void> {
    setBusy(`del:${assetId}`);
    try {
      await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addAsset}
        className="grid grid-cols-1 gap-3 rounded-xl border border-sentinel-border bg-sentinel-panel p-5 md:grid-cols-[1fr_2fr_auto]"
      >
        <input
          type="text"
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
        />
        <input
          type="text"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
        />
        <button
          type="submit"
          disabled={busy === "add"}
          className="rounded-md bg-sentinel-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy === "add" ? "Adding…" : "Add asset"}
        </button>
        {error && (
          <p className="md:col-span-3 rounded-md border border-sentinel-danger/40 bg-sentinel-danger/10 px-3 py-2 text-xs text-sentinel-danger">
            {error}
          </p>
        )}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {assets.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-sentinel-border bg-sentinel-panel p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {a.name}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-sentinel-accent">
                  {a.url}
                </p>
              </div>
              <button
                onClick={() => remove(a.id)}
                disabled={busy === `del:${a.id}`}
                className="rounded-md border border-sentinel-border px-2 py-1 text-[11px] text-sentinel-muted hover:bg-sentinel-bg"
                title="Remove asset"
              >
                {busy === `del:${a.id}` ? "…" : "Remove"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-sentinel-muted">
                {a.lastScanAt ? (
                  <span>
                    Last scan: <TimeAgo timestamp={a.lastScanAt} /> · score{" "}
                    <span className="text-slate-200">{a.lastScore ?? 0}</span>
                  </span>
                ) : (
                  "Never scanned"
                )}
              </div>
              <div className="flex items-center gap-2">
                {a.lastSeverity && <SeverityBadge severity={a.lastSeverity} />}
                <button
                  onClick={() => scan(a.id)}
                  disabled={busy === `scan:${a.id}`}
                  className="rounded-md bg-sentinel-accent px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {busy === `scan:${a.id}` ? "Scanning…" : "Run scan"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="md:col-span-2 rounded-xl border border-dashed border-sentinel-border bg-sentinel-panel/40 p-6 text-center text-sm text-sentinel-muted">
            No assets yet. Add a URL above to start scanning.
          </div>
        )}
      </div>
    </div>
  );
}
