"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const BUCKETS = 60; // last 60 minutes

export function AttackTimeline({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const data = useMemo(() => {
    const now = Date.now();
    const arr = new Array<number>(BUCKETS).fill(0);
    for (const it of items) {
      const ts = it.createdAt;
      if (!Number.isFinite(ts)) continue;
      const ageMin = Math.floor((now - ts) / 60000);
      if (ageMin >= 0 && ageMin < BUCKETS) {
        arr[BUCKETS - 1 - ageMin] += 1;
      }
    }
    return arr;
  }, [items]);

  const max = Math.max(1, ...data);
  const W = 600;
  const H = 120;
  const stepX = W / (BUCKETS - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = H - 8 - (v / max) * (H - 16);
    return [x, y] as const;
  });
  const path =
    points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + ` L${W},${H} L0,${H} Z`;
  const strokePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="glass hud-frame scanlines relative overflow-hidden rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎ATTACK TIMELINE · 60 MIN
        </p>
        <p className="font-mono text-[10px] text-slate-500">
          peak {max}/min · total {data.reduce((a, b) => a + b, 0)}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full">
        <defs>
          <linearGradient id="atlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="atlStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ff2bd6" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            x2={W}
            y1={H * p}
            y2={H * p}
            stroke="#1f2a44"
            strokeDasharray="2 4"
          />
        ))}
        <path d={path} fill="url(#atlFill)" />
        <path
          d={strokePath}
          fill="none"
          stroke="url(#atlStroke)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {points.map(([x, y], i) =>
          data[i] === max && data[i] > 0 ? (
            <circle key={i} cx={x} cy={y} r="3" fill="#ff2bd6">
              <animate
                attributeName="r"
                values="3;6;3"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
          ) : null,
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-500">
        <span>-60m</span>
        <span>-45m</span>
        <span>-30m</span>
        <span>-15m</span>
        <span>now</span>
      </div>
    </div>
  );
}
