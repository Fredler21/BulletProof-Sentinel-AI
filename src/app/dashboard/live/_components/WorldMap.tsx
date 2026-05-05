"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const HOME = { lat: 38, lon: -97 }; // pulse target (US-ish)

function project(lat: number, lon: number): { x: number; y: number } {
  // Equirectangular projection on a 1000x500 viewBox.
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

export function WorldMap({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const target = project(HOME.lat, HOME.lon);
  const points = useMemo(() => {
    return items
      .filter((i) => i.coords)
      .slice(0, 80)
      .map((i, idx) => {
        const p = project(i.coords!.lat, i.coords!.lon);
        return { ...i, x: p.x, y: p.y, idx };
      });
  }, [items]);

  return (
    <div className="relative h-[440px] overflow-hidden rounded-lg border border-neon-cyan/30 bg-black/60 shadow-neon-cyan">
      <div className="flex items-center justify-between border-b border-neon-cyan/30 bg-black/60 px-3 py-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-neon-cyan">
          ▎GLOBAL ATTACK SURFACE
        </p>
        <span className="font-mono text-[10px] text-slate-400">
          {points.length} geo-located events
        </span>
      </div>

      <svg viewBox="0 0 1000 500" className="block h-[400px] w-full">
        <defs>
          <pattern
            id="grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#0d2a3a"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="500" fill="url(#grid)" />

        {/* Equator + prime meridian guides */}
        <line
          x1="0"
          y1="250"
          x2="1000"
          y2="250"
          stroke="#0e3a4d"
          strokeDasharray="4 6"
          strokeWidth="0.6"
        />
        <line
          x1="500"
          y1="0"
          x2="500"
          y2="500"
          stroke="#0e3a4d"
          strokeDasharray="4 6"
          strokeWidth="0.6"
        />

        {/* Attack vectors */}
        {points.map((p) => {
          const color = SEV_COLOR[p.severity] ?? SEV_COLOR.low;
          return (
            <g key={p.id}>
              <line
                x1={p.x}
                y1={p.y}
                x2={target.x}
                y2={target.y}
                stroke={color}
                strokeOpacity={0.18}
                strokeWidth={0.6}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={2.4}
                fill={color}
                opacity={0.95}
              />
              <circle cx={p.x} cy={p.y} r={6} fill={color} opacity={0.18}>
                <animate
                  attributeName="r"
                  from="3"
                  to="14"
                  dur="2s"
                  begin={`${(p.idx % 8) * 0.25}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.55"
                  to="0"
                  dur="2s"
                  begin={`${(p.idx % 8) * 0.25}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

        {/* Home base */}
        <g>
          <circle cx={target.x} cy={target.y} r={4} fill="#22ff88" />
          <circle
            cx={target.x}
            cy={target.y}
            r={10}
            fill="#22ff88"
            opacity={0.25}
          >
            <animate
              attributeName="r"
              from="5"
              to="22"
              dur="1.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>
    </div>
  );
}
