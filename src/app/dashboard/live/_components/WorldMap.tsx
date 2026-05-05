"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const HOME = { lat: 38, lon: -97 };

function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

const SEV_COLOR: Record<string, string> = {
  low: "#94a3b8",
  medium: "#22d3ee",
  high: "#ff2bd6",
  critical: "#ff5577",
};

// Stylized low-poly continent silhouettes (equirectangular, viewBox 1000x500).
// Hand-traced from real lat/lon corners — recognisable but holo-flat.
const CONTINENTS: string[] = [
  // North America
  "M42,69 L250,42 L347,83 L320,140 L278,175 L250,200 L260,225 L228,228 L208,194 L172,156 L153,111 L83,83 Z",
  // Greenland (separate blob)
  "M360,55 L405,50 L420,90 L390,115 L365,95 Z",
  // South America
  "M306,219 L350,235 L403,269 L395,310 L370,360 L325,400 L305,395 L295,335 L290,290 L283,250 Z",
  // Europe
  "M486,97 L530,80 L578,72 L620,90 L640,118 L605,135 L560,138 L520,140 L490,128 L470,115 Z",
  // UK + Ireland (small)
  "M468,108 L478,100 L484,118 L472,125 Z",
  // Africa
  "M472,153 L520,148 L589,160 L605,170 L630,200 L640,235 L615,290 L595,335 L555,355 L525,335 L495,280 L475,235 L460,200 L455,175 Z",
  // Madagascar
  "M624,300 L634,295 L640,330 L628,335 Z",
  // Asia (huge)
  "M540,55 L720,42 L920,55 L975,80 L955,110 L905,135 L865,165 L820,195 L800,225 L760,228 L720,205 L690,180 L655,170 L625,150 L605,135 L645,118 L680,100 L650,80 Z",
  // India peninsula
  "M695,180 L720,180 L735,205 L725,235 L710,232 L700,205 Z",
  // SE Asia / Indochina
  "M790,205 L820,210 L835,240 L815,255 L795,235 Z",
  // Indonesia / island arcs
  "M780,255 L815,255 L840,265 L870,265 L895,272 L880,280 L835,275 L800,272 Z",
  // Japan
  "M905,135 L920,130 L928,160 L915,165 Z",
  // Australia
  "M820,290 L900,288 L935,310 L925,348 L870,360 L825,345 L815,315 Z",
  // New Zealand
  "M955,360 L965,355 L972,378 L960,382 Z",
  // Antarctica strip
  "M0,455 L1000,455 L1000,495 L900,488 L600,492 L300,488 L0,495 Z",
];

// Small dot islands (Pacific, Caribbean, etc.) for atmosphere.
const ISLANDS: [number, number][] = [
  [320, 200], [305, 215], [330, 195],
  [120, 195], [108, 205], [90, 215], [70, 230],
  [965, 250], [945, 270], [930, 285],
  [770, 235], [755, 250],
  [410, 260], [395, 360],
];

function curvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const nx = -dy / dist;
  const ny = dx / dist;
  const lift = Math.min(180, dist * 0.35);
  const cx = mx + nx * lift;
  const cy = my + ny * lift;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function WorldMap({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const target = project(HOME.lat, HOME.lon);
  const points = useMemo(() => {
    return items
      .filter((i) => i.coords)
      .slice(0, 60)
      .map((i, idx) => {
        const p = project(i.coords!.lat, i.coords!.lon);
        return { ...i, x: p.x, y: p.y, idx };
      });
  }, [items]);

  return (
    <div className="glass holo-border hud-frame scanlines relative h-[460px] overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎GLOBAL ATTACK SURFACE · LIVE
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
          {points.length} geo-located · home: KC-CENTRAL
        </span>
      </div>

      <svg viewBox="0 0 1000 500" className="block h-[420px] w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0d2a3a" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="globePulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="continentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.10" />
          </linearGradient>
          <filter id="continentGlow">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <linearGradient id="arc-low" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="arc-medium" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="arc-high" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff2bd6" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="arc-critical" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff5577" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff5577" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background grid + globe glow */}
        <rect width="1000" height="500" fill="url(#grid)" />
        <ellipse cx={target.x} cy={target.y} rx="220" ry="140" fill="url(#globePulse)" />

        {/* Equator + meridian guides */}
        <line x1="0" y1="250" x2="1000" y2="250" stroke="#0e3a4d" strokeDasharray="4 6" strokeWidth="0.6" />
        <line x1="500" y1="0" x2="500" y2="500" stroke="#0e3a4d" strokeDasharray="4 6" strokeWidth="0.6" />
        {[125, 375].map((y) => (
          <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#0e3a4d" strokeDasharray="2 8" strokeWidth="0.5" />
        ))}

        {/* Continents — holographic silhouettes */}
        <g filter="url(#continentGlow)">
          {CONTINENTS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="url(#continentFill)"
              stroke="#22d3ee"
              strokeOpacity="0.55"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          ))}
          {ISLANDS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.2" fill="#22d3ee" opacity="0.55" />
          ))}
        </g>

        {/* Attack arcs */}
        {points.map((p) => {
          const color = SEV_COLOR[p.severity] ?? SEV_COLOR.low;
          const grad = `url(#arc-${p.severity ?? "low"})`;
          const path = curvePath(p.x, p.y, target.x, target.y);
          const dur = 2 + (p.idx % 5) * 0.4;
          return (
            <g key={p.id}>
              <path d={path} stroke={grad} strokeWidth="0.9" fill="none" opacity="0.7" />
              <circle r={1.8} fill={color}>
                <animateMotion path={path} dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={p.x} cy={p.y} r={2.6} fill={color} opacity={0.95} />
              <circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.18}>
                <animate attributeName="r" from="3" to="14" dur="2s" begin={`${(p.idx % 8) * 0.25}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" begin={`${(p.idx % 8) * 0.25}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Home base */}
        <g>
          <circle cx={target.x} cy={target.y} r={5} fill="#22ff88" />
          <circle cx={target.x} cy={target.y} r={10} fill="none" stroke="#22ff88" strokeWidth="0.8" opacity={0.55}>
            <animate attributeName="r" from="6" to="28" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text x={target.x + 9} y={target.y - 6} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#22ff88">
            ▌ SENTINEL-CORE
          </text>
        </g>
      </svg>

      <div className="absolute bottom-2 left-3 flex gap-3 font-mono text-[9px] uppercase tracking-widest">
        <Legend color="#94a3b8" label="low" />
        <Legend color="#22d3ee" label="medium" />
        <Legend color="#ff2bd6" label="high" />
        <Legend color="#ff5577" label="critical" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): React.ReactElement {
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

