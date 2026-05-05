"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const SEV_COLOR: Record<string, string> = {
  low: "text-slate-300 border-slate-500/30",
  medium: "text-neon-cyan border-neon-cyan/40",
  high: "text-neon-pink border-neon-pink/40",
  critical: "text-neon-red border-neon-red/50",
};

export function LiveFeed({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = new Set<string>();
    for (const it of items) {
      if (!seen.current.has(it.id)) fresh.add(it.id);
    }
    if (fresh.size > 0) {
      setFlash(fresh);
      const t = setTimeout(() => setFlash(new Set()), 1500);
      for (const id of fresh) seen.current.add(id);
      return () => clearTimeout(t);
    }
  }, [items]);

  return (
    <div className="glass holo-border hud-frame scanlines relative h-[440px] overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-pink">
          ▎LIVE THREAT FEED
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
          {items.length} events
        </span>
      </div>
      <ul className="h-[400px] overflow-y-auto font-mono text-xs">
        {items.map((it) => {
          const isNew = flash.has(it.id);
          return (
            <li
              key={it.id}
              className={`group flex items-start gap-2 border-b border-white/5 px-3 py-1.5 transition-colors ${isNew ? "animate-ticker bg-neon-pink/10" : ""}`}
            >
              <span className="w-16 shrink-0 text-[10px] text-slate-500">
                {new Date(it.createdAt).toLocaleTimeString().slice(0, 8)}
              </span>
              <span
                className={`w-16 shrink-0 rounded border px-1 text-center text-[10px] uppercase ${SEV_COLOR[it.severity] ?? SEV_COLOR.low}`}
              >
                {it.severity}
              </span>
              <span className="w-32 shrink-0 truncate text-[10px] text-neon-cyan">
                {it.type}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-300">
                {it.ip ?? "—"} {it.route ? `· ${it.route}` : ""}
                {it.geo?.countryCode ? ` · ${it.geo.countryCode}` : ""}
              </span>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-slate-500">
            Waiting for telemetry…
          </li>
        )}
      </ul>
    </div>
  );
}
