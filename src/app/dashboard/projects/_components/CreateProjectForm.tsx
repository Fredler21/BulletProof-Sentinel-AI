"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { apiKey: string };
      setCreatedKey(data.apiKey);
      setCreatedName(name.trim());
      setName("");
      setDomain("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey(): Promise<void> {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
        Create Project
      </h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          placeholder="Project name (e.g. edlight.org)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-sentinel-border bg-black/30 px-3 py-2 text-sm text-white placeholder-sentinel-muted/60 focus:border-sentinel-accent focus:outline-none"
        />
        <input
          type="text"
          placeholder="Domain (optional, e.g. security.edlight.org)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-lg border border-sentinel-border bg-black/30 px-3 py-2 text-sm text-white placeholder-sentinel-muted/60 focus:border-sentinel-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg border border-sentinel-accent bg-sentinel-accent/10 px-4 py-2 text-sm font-semibold text-sentinel-accent transition hover:bg-sentinel-accent/20 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create + get API key"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {createdKey && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-300">
            API key for {createdName} — copy it now, it won&rsquo;t be shown again
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-emerald-500/40 bg-black/40 px-3 py-2 font-mono text-xs text-emerald-200">
              {createdKey}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="rounded border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setCreatedKey(null)}
              className="rounded border border-sentinel-border px-3 py-2 text-xs text-sentinel-muted hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
