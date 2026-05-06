"use client";

import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type {
  FeatureCollection,
  Feature,
  Geometry,
} from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

const WIDTH = 1000;
const HEIGHT = 500;
const HOME = { lat: 38, lon: -97, label: "SENTINEL-CORE" };

const SEV_COLOR: Record<string, string> = {
  low: "#94a3b8",
  medium: "#22d3ee",
  high: "#ff2bd6",
  critical: "#ff5577",
};

interface AttackPoint {
  id: string;
  ip: string | null;
  severity: string;
  city: string | null;
  country: string | null;
  org: string | null;
  x: number;
  y: number;
  hx: number;
  hy: number;
  idx: number;
}

function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return `M ${x1} ${y1}`;
  const nx = -dy / dist;
  const ny = dx / dist;
  const lift = Math.min(160, dist * 0.3);
  const cx = mx + nx * lift;
  const cy = my + ny * lift;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function WorldMap({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [countries, setCountries] = useState<Feature<Geometry>[]>([]);
  const [hover, setHover] = useState<AttackPoint | null>(null);

  // Lazy-load the world atlas TopoJSON on the client. Cached by the browser
  // after first load. ~80KB.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = (await import("world-atlas/countries-110m.json")) as unknown as {
          default: Topology<{ countries: GeometryCollection }>;
        };
        const topo = mod.default;
        const fc = feature(
          topo,
          topo.objects.countries,
        ) as unknown as FeatureCollection<Geometry>;
        if (alive) setCountries(fc.features);
      } catch {
        /* network/atlas import failure — map will render empty land */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const projection = useMemo(
    () =>
      geoEqualEarth()
        .scale(180)
        .translate([WIDTH / 2, HEIGHT / 2]),
    [],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const home = useMemo(() => {
    const p = projection([HOME.lon, HOME.lat]);
    return p ? { x: p[0], y: p[1] } : { x: WIDTH / 2, y: HEIGHT / 2 };
  }, [projection]);

  const points: AttackPoint[] = useMemo(() => {
    const arr: AttackPoint[] = [];
    let i = 0;
    for (const it of items) {
      if (!it.coords) continue;
      const xy = projection([it.coords.lon, it.coords.lat]);
      if (!xy) continue;
      arr.push({
        id: it.id,
        ip: it.ip,
        severity: it.severity,
        city: it.geo?.city ?? null,
        country: it.geo?.country ?? null,
        org: it.geo?.org ?? null,
        x: xy[0],
        y: xy[1],
        hx: home.x,
        hy: home.y,
        idx: i++,
      });
      if (arr.length >= 80) break;
    }
    return arr;
  }, [items, projection, home]);

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

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-[420px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0d2a3a" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="globePulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />
        <ellipse cx={home.x} cy={home.y} rx="220" ry="140" fill="url(#globePulse)" />

        {/* Real country borders from world-atlas TopoJSON */}
        <g>
          {countries.map((c, i) => {
            const d = pathGen(c as GeoPermissibleObjects);
            if (!d) return null;
            return (
              <path
                key={i}
                d={d}
                fill="url(#landFill)"
                stroke="#22d3ee"
                strokeOpacity={0.45}
                strokeWidth={0.5}
                strokeLinejoin="round"
              />
            );
          })}
        </g>

        {/* Attack arcs */}
        {points.map((p) => {
          const color = SEV_COLOR[p.severity] ?? SEV_COLOR.low;
          const path = curvePath(p.x, p.y, p.hx, p.hy);
          const dur = 2 + (p.idx % 5) * 0.4;
          return (
            <g key={p.id}>
              <path d={path} stroke={color} strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
              <circle r={1.8} fill={color}>
                <animateMotion path={path} dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
              <circle
                cx={p.x}
                cy={p.y}
                r={3}
                fill={color}
                opacity={0.95}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
              <circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.18}>
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
                  from="0.5"
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
          <circle cx={home.x} cy={home.y} r={5} fill="#22ff88" />
          <circle
            cx={home.x}
            cy={home.y}
            r={10}
            fill="none"
            stroke="#22ff88"
            strokeWidth={0.8}
            opacity={0.55}
          >
            <animate attributeName="r" from="6" to="28" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text
            x={home.x + 9}
            y={home.y - 6}
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            fill="#22ff88"
          >
            ▌ {HOME.label}
          </text>
        </g>
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[260px] rounded-md border border-neon-cyan/40 bg-black/85 px-3 py-2 font-mono text-[10px] text-slate-100 shadow-neon-cyan"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: `calc(${(hover.y / HEIGHT) * 100}% + 30px)`,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="text-neon-cyan">▌ {hover.ip ?? "unknown ip"}</div>
          <div className="text-slate-300">
            {[hover.city, hover.country].filter(Boolean).join(", ") || "unknown location"}
          </div>
          {hover.org && <div className="text-slate-400">{hover.org}</div>}
          <div className="mt-1 uppercase" style={{ color: SEV_COLOR[hover.severity] }}>
            severity: {hover.severity}
          </div>
        </div>
      )}

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
