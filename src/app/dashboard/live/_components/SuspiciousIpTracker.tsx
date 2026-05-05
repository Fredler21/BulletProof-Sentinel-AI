"use client";

import { Fragment, useMemo, useState } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

interface IpRow {
  ip: string;
  count: number;
  lastSeen: number;
  worstSev: "low" | "medium" | "high" | "critical";
  country: string;
  countryCode: string | null;
  city: string | null;
  org: string | null;
  events: FeedItemWithCoords[];
}

const SEV_RANK: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const SEV_STYLE: Record<string, string> = {
  low: "text-slate-300 border-slate-500/30",
  medium: "text-neon-cyan border-neon-cyan/40",
  high: "text-neon-pink border-neon-pink/40",
  critical: "text-neon-red border-neon-red/50",
};

export function SuspiciousIpTracker({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [busy, setBusy] = useState<Record<string, "idle" | "ok" | "err" | "loading">>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo<IpRow[]>(() => {
    const map = new Map<string, IpRow>();
    for (const it of items) {
      if (!it.ip) continue;
      const cur = map.get(it.ip);
      const sev = (it.severity ?? "low") as IpRow["worstSev"];
      if (cur) {
        cur.count += 1;
        cur.lastSeen = Math.max(cur.lastSeen, it.createdAt);
        if (SEV_RANK[sev] > SEV_RANK[cur.worstSev]) cur.worstSev = sev;
        cur.events.push(it);
      } else {
        map.set(it.ip, {
          ip: it.ip,
          count: 1,
          lastSeen: it.createdAt,
          worstSev: sev,
          country: it.geo?.country ?? "—",
          countryCode: it.geo?.countryCode ?? null,
          city: it.geo?.city ?? null,
          org: it.geo?.org ?? null,
          events: [it],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const dr = SEV_RANK[b.worstSev] - SEV_RANK[a.worstSev];
      if (dr !== 0) return dr;
      return b.count - a.count;
    });
  }, [items]);

  async function block(ip: string): Promise<void> {
    setBusy((b) => ({ ...b, [ip]: "loading" }));
    try {
      const r = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ip,
          reason: "Live console quick-block",
          ttlMinutes: 60,
        }),
      });
      setBusy((b) => ({ ...b, [ip]: r.ok ? "ok" : "err" }));
    } catch {
      setBusy((b) => ({ ...b, [ip]: "err" }));
    }
    setTimeout(() => setBusy((b) => ({ ...b, [ip]: "idle" })), 2500);
  }

  async function copy(ip: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(ip);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="glass holo-border hud-frame scanlines relative overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-pink">
          ▎SUSPICIOUS IP TRACKER · {rows.length} unique
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
          ranked by severity · count
        </span>
      </div>

      <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
        <table className="w-full font-mono text-[11px]">
          <thead className="sticky top-0 z-10 bg-black/60 text-[9px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">IP / Origin</th>
              <th className="px-2 py-2 text-left">Sev</th>
              <th className="px-2 py-2 text-right">Hits</th>
              <th className="px-2 py-2 text-left">Last</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = busy[r.ip] ?? "idle";
              const isExpanded = expanded === r.ip;
              return (
                <Fragment key={r.ip}>
                  <tr
                    className="border-b border-white/5 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(isExpanded ? null : r.ip)
                          }
                          className="font-mono text-neon-cyan hover:underline"
                        >
                          {r.ip}
                        </button>
                        {r.countryCode && (
                          <span className="rounded border border-white/10 bg-black/40 px-1 text-[9px] uppercase tracking-widest text-slate-300">
                            {r.countryCode}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {[r.city, r.country].filter(Boolean).join(", ")}
                        {r.org ? ` · ${r.org}` : ""}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded border bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${SEV_STYLE[r.worstSev]}`}
                      >
                        {r.worstSev}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                      {r.count}
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-500">
                      {timeAgo(r.lastSeen)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => copy(r.ip)}
                          className="rounded border border-neon-cyan/30 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-widest text-neon-cyan hover:bg-neon-cyan/10"
                          title="Copy IP"
                        >
                          {copied === r.ip ? "✓ copied" : "copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => block(r.ip)}
                          disabled={status === "loading" || status === "ok"}
                          className={`rounded border px-2 py-1 text-[9px] uppercase tracking-widest transition ${
                            status === "ok"
                              ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
                              : status === "err"
                                ? "border-neon-red/40 bg-neon-red/10 text-neon-red"
                                : status === "loading"
                                  ? "border-slate-600 bg-black/40 text-slate-500"
                                  : "border-neon-pink/40 bg-black/40 text-neon-pink hover:bg-neon-pink/10"
                          }`}
                          title="Block this IP for 60 min"
                        >
                          {status === "ok"
                            ? "✓ blocked"
                            : status === "err"
                              ? "✗ failed"
                              : status === "loading"
                                ? "…"
                                : "block 60m"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-black/40">
                      <td colSpan={5} className="px-3 py-2">
                        <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                          Recent events ({r.events.length})
                        </p>
                        <ul className="space-y-1">
                          {r.events.slice(0, 8).map((e) => (
                            <li
                              key={e.id}
                              className="flex items-start gap-2 font-mono text-[10px]"
                            >
                              <span className="w-14 shrink-0 text-slate-500">
                                {new Date(e.createdAt)
                                  .toISOString()
                                  .slice(11, 19)}
                              </span>
                              <span
                                className={`w-14 shrink-0 rounded border bg-black/50 px-1 text-center text-[9px] uppercase ${SEV_STYLE[e.severity ?? "low"]}`}
                              >
                                {e.severity}
                              </span>
                              <span className="w-32 shrink-0 truncate text-neon-cyan">
                                {e.type}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-slate-400">
                                {e.route ?? e.message}
                              </span>
                            </li>
                          ))}
                          {r.events.length > 8 && (
                            <li className="font-mono text-[10px] text-slate-500">
                              …+{r.events.length - 8} more
                            </li>
                          )}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center font-mono text-xs text-slate-500"
                >
                  No suspicious IPs in the live window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
