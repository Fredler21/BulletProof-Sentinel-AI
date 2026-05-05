"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

interface Session {
  ip: string;
  geo: string;
  org: string | null;
  events: FeedItemWithCoords[];
  firstAt: number;
  lastAt: number;
}

function buildSessions(items: FeedItemWithCoords[]): Session[] {
  const map = new Map<string, Session>();
  for (const it of items) {
    if (!it.ip) continue;
    if (it.type !== "honeypot.trigger" && it.type !== "auth.login.failure") {
      continue;
    }
    const cur = map.get(it.ip);
    if (cur) {
      cur.events.push(it);
      cur.firstAt = Math.min(cur.firstAt, it.createdAt);
      cur.lastAt = Math.max(cur.lastAt, it.createdAt);
    } else {
      map.set(it.ip, {
        ip: it.ip,
        geo: [it.geo?.city, it.geo?.country].filter(Boolean).join(", ") || "—",
        org: it.geo?.org ?? null,
        events: [it],
        firstAt: it.createdAt,
        lastAt: it.createdAt,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 6);
}

export function HoneypotSessions({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const sessions = useMemo(() => buildSessions(items), [items]);

  return (
    <div className="glass holo-border hud-frame scanlines relative h-[440px] overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">
          ▎HONEYPOT SESSION MONITOR
        </p>
        <span className="animate-flicker font-mono text-[9px] uppercase tracking-widest text-neon-green">
          ● rec
        </span>
      </div>
      <div className="grid h-[400px] grid-cols-1 gap-2 overflow-y-auto p-2 md:grid-cols-2">
        {sessions.map((s) => (
          <div
            key={s.ip}
            className="rounded border border-neon-green/20 bg-black/60 p-2 font-mono text-[11px] text-neon-green"
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="truncate text-neon-cyan">{s.ip}</span>
              <span className="text-[10px] text-slate-500">
                {Math.max(1, Math.round((s.lastAt - s.firstAt) / 1000))}s
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              {s.geo}
              {s.org ? ` · ${s.org}` : ""}
            </div>
            <div className="mt-1 max-h-20 overflow-hidden">
              {s.events.slice(0, 4).map((e) => (
                <p key={e.id} className="truncate">
                  <span className="text-slate-500">$</span>{" "}
                  {e.type === "auth.login.failure"
                    ? `attempt-login --ip=${s.ip}`
                    : `probe ${e.route ?? "/"}`}
                </p>
              ))}
              {s.events.length > 4 && (
                <p className="text-slate-500">…+{s.events.length - 4} more</p>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="col-span-full py-10 text-center font-mono text-xs text-slate-500">
            No active honeypot sessions.
          </p>
        )}
      </div>
    </div>
  );
}
