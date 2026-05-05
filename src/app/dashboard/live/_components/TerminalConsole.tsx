"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

interface Line {
  id: string;
  ts: string;
  text: string;
  color: string;
}

const SYS_LINES: Line[] = [
  { id: "boot", ts: "", text: "sentinel-core: kernel relay v5.1 online", color: "text-neon-cyan" },
  { id: "feed", ts: "", text: "stream: telemetry firehose attached (tap=admin)", color: "text-slate-300" },
  { id: "ai", ts: "", text: "copilot: gemini-flash · context window 1m", color: "text-neon-purple" },
];

export function TerminalConsole({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [lines, setLines] = useState<Line[]>(SYS_LINES);
  const seenRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fresh: Line[] = [];
    for (const it of items.slice(0, 30)) {
      if (seenRef.current.has(it.id)) continue;
      seenRef.current.add(it.id);
      const ts = new Date(it.createdAt).toISOString().slice(11, 19);
      const sev = it.severity ?? "info";
      const color =
        sev === "critical"
          ? "text-neon-red"
          : sev === "high"
            ? "text-neon-pink"
            : sev === "medium"
              ? "text-neon-amber"
              : "text-neon-green";
      fresh.push({
        id: it.id,
        ts,
        text: `${it.type ?? "event"} · src=${it.ip ?? "?"} · ${it.geo?.country ?? "??"} · sev=${sev}`,
        color,
      });
    }
    if (fresh.length === 0) return;
    setLines((prev) => [...prev, ...fresh].slice(-120));
  }, [items]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="glass holo-border hud-frame scanlines relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎TTY · /dev/sentinel
        </p>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neon-red/70" />
          <span className="h-2 w-2 rounded-full bg-neon-amber/70" />
          <span className="h-2 w-2 rounded-full bg-neon-green/70" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto bg-black/60 p-3 font-mono text-[11px] leading-relaxed"
      >
        {lines.map((l, i) => (
          <div key={`${l.id}-${i}`} className="whitespace-pre-wrap">
            <span className="text-slate-600">[{l.ts || "boot"}]</span>{" "}
            <span className="text-neon-cyan">root@sentinel</span>
            <span className="text-slate-500">:</span>
            <span className="text-neon-purple">~</span>
            <span className="text-slate-500">#</span>{" "}
            <span className={l.color}>{l.text}</span>
          </div>
        ))}
        <div className="text-slate-600">
          <span className="text-neon-cyan">root@sentinel</span>
          <span className="text-slate-500">:</span>
          <span className="text-neon-purple">~</span>
          <span className="text-slate-500">#</span>{" "}
          <span className="caret" />
        </div>
      </div>
    </div>
  );
}
