"use client";

import { useMemo } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function HeatmapGrid({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () =>
      new Array<number>(24).fill(0),
    );
    for (const it of items) {
      const ts = it.createdAt;
      if (!Number.isFinite(ts)) continue;
      const d = new Date(ts);
      g[d.getUTCDay()][d.getUTCHours()] += 1;
    }
    return g;
  }, [items]);
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="glass hud-frame relative overflow-hidden rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎ATTACK HEATMAP · DAY × HOUR (UTC)
        </p>
        <p className="font-mono text-[10px] text-slate-500">
          peak {max} · scale 0→{max}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] font-mono text-[9px]">
          <thead>
            <tr>
              <th className="w-8" />
              {Array.from({ length: 24 }).map((_, h) => (
                <th
                  key={h}
                  className="text-center text-slate-500"
                >
                  {h % 3 === 0 ? h : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, di) => (
              <tr key={di}>
                <td className="pr-1 text-right uppercase tracking-widest text-slate-500">
                  {DAYS[di]}
                </td>
                {row.map((v, h) => {
                  const r = v / max;
                  const bg = cellColor(r);
                  return (
                    <td
                      key={h}
                      title={`${DAYS[di]} ${h}:00 — ${v} events`}
                      style={{ background: bg }}
                      className="h-4 rounded-sm border border-white/5"
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        <span>low</span>
        <div className="h-1.5 flex-1 rounded bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/60 to-rose-500/90" />
        <span>high</span>
      </div>
    </div>
  );
}

function cellColor(r: number): string {
  if (r === 0) return "rgba(34,211,238,0.04)";
  if (r < 0.25) return `rgba(34,211,238,${0.18 + r})`;
  if (r < 0.55) return `rgba(168,85,247,${0.25 + r * 0.5})`;
  return `rgba(255,43,128,${0.45 + r * 0.4})`;
}
