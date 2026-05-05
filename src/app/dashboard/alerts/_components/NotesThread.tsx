"use client";

import { useState, type FormEvent } from "react";
import type { AlertNote } from "@/lib/types";

export function NotesThread({
  alertId,
  initialNotes,
}: {
  alertId: string;
  initialNotes: AlertNote[];
}): React.ReactElement {
  const [notes, setNotes] = useState<AlertNote[]>(initialNotes);
  const [body, setBody] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = (await res.json()) as { note?: AlertNote; error?: string };
      if (!res.ok || !data.note) throw new Error(data.error ?? "Failed");
      setNotes((prev) => [...prev, data.note as AlertNote]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-sentinel-border bg-sentinel-panel">
      <header className="border-b border-sentinel-border px-5 py-3">
        <h2 className="text-sm font-medium text-white">
          Investigation Notes ({notes.length})
        </h2>
      </header>

      <ul className="divide-y divide-sentinel-border/60">
        {notes.map((n) => (
          <li key={n.id} className="px-5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold text-slate-100">
                {n.authorName ?? n.authorUid}
              </p>
              <p className="text-[11px] text-sentinel-muted">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
              {n.body}
            </p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="px-5 py-4 text-center text-xs text-sentinel-muted">
            No notes yet. Add the first one.
          </li>
        )}
      </ul>

      <form onSubmit={onSubmit} className="border-t border-sentinel-border p-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note for the team…"
          className="w-full resize-y rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
        />
        <div className="mt-2 flex items-center justify-between">
          {error ? (
            <p className="text-xs text-sentinel-danger">{error}</p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="rounded-md bg-sentinel-accent px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </section>
  );
}
