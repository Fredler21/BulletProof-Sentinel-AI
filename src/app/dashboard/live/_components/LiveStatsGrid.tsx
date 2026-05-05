"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveStats } from "./LiveCommandCenter";

interface CardSpec {
  key: keyof Omit<LiveStats, "serverTime">;
  label: string;
  color: "cyan" | "pink" | "green" | "red" | "amber" | "purple";
  unit?: string;
}

const CARDS: CardSpec[] = [
  { key: "activeAttackers", label: "Active Attackers", color: "red" },
  { key: "connectionsToday", label: "Connections / 24h", color: "cyan" },
  { key: "uniqueIps", label: "Unique IPs", color: "purple" },
  { key: "highRiskSessions", label: "High-Risk Sessions", color: "pink" },
  { key: "vulnsDetected", label: "Vulnerabilities", color: "amber" },
  { key: "honeypotEngagements", label: "Honeypot Engagements", color: "green" },
  { key: "commandsExecuted", label: "Commands Logged", color: "cyan" },
  { key: "riskScore", label: "Worst Risk Score", color: "red", unit: "/100" },
];

const COLOR_CLASS: Record<CardSpec["color"], string> = {
  cyan: "border-neon-cyan/30 text-neon-cyan shadow-neon-cyan",
  pink: "border-neon-pink/30 text-neon-pink shadow-neon-pink",
  green: "border-neon-green/30 text-neon-green shadow-neon-green",
  red: "border-neon-red/30 text-neon-red shadow-neon-red",
  amber: "border-amber-400/30 text-amber-300",
  purple: "border-purple-400/40 text-purple-300",
};

export function LiveStatsGrid({
  stats,
}: {
  stats: LiveStats | null;
}): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {CARDS.map((c) => (
        <StatCard
          key={c.key}
          label={c.label}
          value={stats ? (stats[c.key] as number) : null}
          color={c.color}
          unit={c.unit}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  unit,
}: {
  label: string;
  value: number | null;
  color: CardSpec["color"];
  unit?: string;
}): React.ReactElement {
  const display = useAnimatedNumber(value);
  return (
    <div
      className={`glass hud-frame relative overflow-hidden rounded-xl border p-3 ${COLOR_CLASS[color]}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-x-0 top-0 h-px animate-scanline bg-current" />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {value === null ? "···" : display}
        {unit && <span className="ml-1 text-xs opacity-60">{unit}</span>}
      </p>
      <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
    </div>
  );
}

function useAnimatedNumber(target: number | null): number {
  const [v, setV] = useState<number>(target ?? 0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const from = v;
    const dur = 600;
    const tick = (t: number): void => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(from + (target - from) * k));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}
