"use client";

import { useEffect, useState } from "react";
import type { LiveStats } from "./LiveCommandCenter";

export function TopStatusBar({
  stats,
}: {
  stats: LiveStats | null;
}): React.ReactElement {
  const [now, setNow] = useState<string>("");
  const [up, setUp] = useState<number>(0);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => {
      const d = new Date();
      setNow(
        d.toISOString().replace("T", " ").slice(0, 19) + "Z",
      );
      setUp(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const risk = stats?.riskScore ?? 0;
  const level =
    risk >= 80
      ? { label: "CRITICAL", color: "text-neon-red", bg: "bg-neon-red/20", defcon: "DEFCON 1" }
      : risk >= 60
        ? { label: "HIGH", color: "text-neon-pink", bg: "bg-neon-pink/15", defcon: "DEFCON 2" }
        : risk >= 35
          ? { label: "ELEVATED", color: "text-neon-amber", bg: "bg-neon-amber/15", defcon: "DEFCON 3" }
          : { label: "GUARDED", color: "text-neon-cyan", bg: "bg-neon-cyan/15", defcon: "DEFCON 4" };
  return (
    <div className="glass holo-border hud-frame relative overflow-hidden rounded-2xl px-5 py-3">
      <div className="grid grid-cols-2 items-center gap-3 md:grid-cols-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            System
          </p>
          <p className="text-holo font-mono text-xs font-semibold tracking-wider">
            SENTINEL · NOMINAL
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Threat Level
          </p>
          <p className={`font-mono text-xs font-bold ${level.color}`}>
            <span className={`mr-2 rounded px-1.5 py-0.5 ${level.bg}`}>
              {level.defcon}
            </span>
            {level.label}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Throughput
          </p>
          <p className="font-mono text-xs text-neon-cyan">
            {stats?.eventsPerMinute ?? 0} <span className="text-slate-500">evt/min</span>
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Active Attackers
          </p>
          <p className="font-mono text-xs text-neon-pink">
            {stats?.activeAttackers ?? 0}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Session Uptime
          </p>
          <p className="font-mono text-xs text-neon-green">
            {fmtUptime(up)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            UTC
          </p>
          <p className="font-mono text-xs text-slate-200 caret">{now}</p>
        </div>
      </div>
    </div>
  );
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
