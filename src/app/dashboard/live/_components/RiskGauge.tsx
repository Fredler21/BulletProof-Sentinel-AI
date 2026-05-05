"use client";

import type { LiveStats } from "./LiveCommandCenter";

export function RiskGauge({
  stats,
}: {
  stats: LiveStats | null;
}): React.ReactElement {
  const value = Math.max(0, Math.min(100, stats?.riskScore ?? 0));
  // Semi-circle from -90deg to 90deg.
  const W = 200;
  const H = 120;
  const cx = W / 2;
  const cy = H - 10;
  const r = 86;
  const arc = (start: number, end: number): string => {
    const a = (start - 180) * (Math.PI / 180);
    const b = (end - 180) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(a);
    const y1 = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(b);
    const y2 = cy + r * Math.sin(b);
    const large = end - start > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const needleAngle = (value / 100) * 180 - 90; // -90 .. +90
  const needleA = ((needleAngle - 90) * Math.PI) / 180;
  const nx = cx + (r - 14) * Math.cos(needleA);
  const ny = cy + (r - 14) * Math.sin(needleA);
  const label =
    value >= 80
      ? { txt: "CRITICAL", color: "text-neon-red" }
      : value >= 60
        ? { txt: "HIGH", color: "text-neon-pink" }
        : value >= 35
          ? { txt: "MODERATE", color: "text-neon-amber" }
          : { txt: "LOW", color: "text-neon-green" };
  return (
    <div className="glass hud-frame relative overflow-hidden rounded-2xl p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
        ▎RISK SCORE
      </p>
      <div className="relative grid place-items-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full">
          <path d={arc(0, 180)} stroke="#1f2a44" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d={arc(0, 60)} stroke="#22ff88" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d={arc(60, 110)} stroke="#fbbf24" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d={arc(110, 150)} stroke="#ff2bd6" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d={arc(150, 180)} stroke="#ff3355" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.9" />
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px #22d3ee)" }}
          />
          <circle cx={cx} cy={cy} r="5" fill="#04060d" stroke="#22d3ee" strokeWidth="1.5" />
        </svg>
        <div className="absolute bottom-1 text-center">
          <p className="font-mono text-2xl font-bold text-white">{value}</p>
          <p className={`font-mono text-[10px] uppercase tracking-[0.3em] ${label.color}`}>
            {label.txt}
          </p>
        </div>
      </div>
    </div>
  );
}
