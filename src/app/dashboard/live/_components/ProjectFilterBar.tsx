"use client";

import { useEffect, useMemo, useState } from "react";

export interface ProjectOption {
  id: string;
  name: string;
  domain: string | null;
  hits: number;
}

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  liveCounts: Record<string, number>;
  maxSelectable?: number;
}

export function ProjectFilterBar({
  selected,
  onChange,
  liveCounts,
  maxSelectable = 3,
}: Props): React.ReactElement {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/v1/projects", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { projects: ProjectOption[] };
        if (alive) setProjects(d.projects ?? []);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function toggle(id: string): void {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (selected.length < maxSelectable) {
      onChange([...selected, id]);
    }
  }

  const totalLive = useMemo(
    () => Object.values(liveCounts).reduce((s, n) => s + n, 0),
    [liveCounts],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sentinel-border bg-sentinel-panel/70 px-3 py-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-sentinel-muted">
        Project filter
      </span>
      <span className="text-[10px] text-sentinel-muted">
        Pick up to {maxSelectable} ({selected.length}/{maxSelectable})
      </span>

      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded border px-2 py-1 transition ${
          selected.length === 0
            ? "border-sentinel-accent bg-sentinel-accent/10 text-sentinel-accent"
            : "border-sentinel-border text-slate-300 hover:border-sentinel-accent"
        }`}
      >
        All sources <span className="ml-1 text-sentinel-muted">({totalLive})</span>
      </button>

      {loading ? (
        <span className="text-sentinel-muted">Loading projects…</span>
      ) : projects.length === 0 ? (
        <span className="text-sentinel-muted">No projects yet</span>
      ) : (
        projects.map((p) => {
          const isOn = selected.includes(p.id);
          const disabled = !isOn && selected.length >= maxSelectable;
          const live = liveCounts[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(p.id)}
              title={p.domain ?? p.name}
              className={`rounded border px-2 py-1 transition ${
                isOn
                  ? "border-sentinel-accent bg-sentinel-accent/15 text-sentinel-accent"
                  : disabled
                    ? "cursor-not-allowed border-sentinel-border/40 text-sentinel-muted/50"
                    : "border-sentinel-border text-slate-200 hover:border-sentinel-accent"
              }`}
            >
              {p.name}
              <span className="ml-1 text-[10px] text-sentinel-muted">
                ({live})
              </span>
            </button>
          );
        })
      )}

      {selected.length > 0 && (
        <span className="ml-auto rounded bg-sentinel-accent/10 px-2 py-1 text-[10px] text-sentinel-accent">
          Showing {selected.length} project{selected.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
