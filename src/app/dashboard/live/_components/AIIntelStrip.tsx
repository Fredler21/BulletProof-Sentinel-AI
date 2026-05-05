"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords, LiveStats } from "./LiveCommandCenter";

function summarize(
  items: FeedItemWithCoords[],
  stats: LiveStats | null,
): {
  headline: string;
  detail: string;
  topCountry: string;
  confidence: number;
} {
  const ipCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const it of items) {
    if (it.ip) ipCounts.set(it.ip, (ipCounts.get(it.ip) ?? 0) + 1);
    if (it.geo?.countryCode)
      countryCounts.set(
        it.geo.countryCode,
        (countryCounts.get(it.geo.countryCode) ?? 0) + 1,
      );
  }
  const topIp = [...ipCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCountry =
    [...countryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const high = items.filter(
    (i) => i.severity === "high" || i.severity === "critical",
  ).length;
  const conf = Math.min(99, 35 + high * 6 + (topIp?.[1] ?? 0) * 3);

  let headline = "Baseline activity. No active campaigns detected.";
  let detail =
    "Telemetry shows nominal background scanning consistent with internet noise.";
  if (high >= 5) {
    headline = "Active reconnaissance campaign in progress.";
    detail = `Multiple high-severity events (${high}) clustered from ${topCountry}. Auto-block is engaged for repeat offenders.`;
  } else if (topIp && topIp[1] >= 4) {
    headline = `Single source ${topIp[0]} is probing aggressively.`;
    detail = `${topIp[1]} events from this IP in the live window. Recommend manual block if pattern continues.`;
  } else if ((stats?.honeypotEngagements ?? 0) > 0) {
    headline = "Honeypots are absorbing reconnaissance traffic.";
    detail = `${stats?.honeypotEngagements ?? 0} engagement(s) in the last 24h — decoys are functioning as designed.`;
  }
  return { headline, detail, topCountry, confidence: conf };
}

export function AIIntelStrip({
  stats,
  items,
}: {
  stats: LiveStats | null;
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const a = useMemo(() => summarize(items, stats), [items, stats]);

  return (
    <div className="glass holo-border hud-frame scanlines relative h-[440px] overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">
          ▎AI THREAT INTELLIGENCE
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-neon-purple/80">
          confidence {a.confidence}%
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded border border-purple-500/30 bg-purple-500/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-300/70">
            Pattern detected
          </p>
          <p className="mt-1 text-sm text-slate-100">{a.headline}</p>
          <p className="mt-1 text-xs text-slate-400">{a.detail}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <Card label="Top origin" value={a.topCountry} color="cyan" />
          <Card
            label="Active IPs"
            value={String(stats?.activeAttackers ?? 0)}
            color="pink"
          />
          <Card
            label="Auto-blocks"
            value={String(stats?.blockedIps ?? 0)}
            color="green"
          />
          <Card
            label="Risk score"
            value={`${stats?.riskScore ?? 0}/100`}
            color="red"
          />
        </div>

        <div className="rounded border border-slate-700/60 bg-black/60 p-2 font-mono text-[11px] text-slate-300">
          <p className="text-purple-300/80">Recommended actions</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400">
            <li>Acknowledge and triage open critical alerts.</li>
            <li>Verify auto-block list and adjust TTLs if needed.</li>
            <li>Run a fresh scan against assets under active probing.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "pink" | "green" | "red";
}): React.ReactElement {
  const map = {
    cyan: "border-neon-cyan/40 text-neon-cyan",
    pink: "border-neon-pink/40 text-neon-pink",
    green: "border-neon-green/40 text-neon-green",
    red: "border-neon-red/40 text-neon-red",
  } as const;
  return (
    <div className={`rounded border bg-black/60 p-2 ${map[color]}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
