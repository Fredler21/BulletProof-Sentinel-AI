"use client";

import { useEffect, useState } from "react";
import type { LiveStats } from "./LiveCommandCenter";

const TARGETS = [
  "tls/handshake",
  "http/headers",
  "ssh/banner",
  "ports/0-65535",
  "dns/exfil",
  "tls/cert-chain",
  "http/cors",
  "auth/jwt-leak",
  "fs/sensitive",
  "kube/secrets",
];

export function VulnScannerWidget({
  stats,
}: {
  stats: LiveStats | null;
}): React.ReactElement {
  const [target, setTarget] = useState<string>(TARGETS[0]);
  const [pct, setPct] = useState<number>(0);
  useEffect(() => {
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 9 + 3;
      if (p >= 100) {
        p = 0;
        setTarget(TARGETS[Math.floor(Math.random() * TARGETS.length)]);
      }
      setPct(p);
    }, 280);
    return () => clearInterval(t);
  }, []);

  const vulns = stats?.vulnsDetected ?? 0;
  const risk = stats?.riskScore ?? 0;
  const C = 84;
  const R = 38;
  const circ = 2 * Math.PI * R;
  return (
    <div className="glass hud-frame scanlines relative overflow-hidden rounded-2xl p-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
        ▎VULNERABILITY SCANNER
      </p>
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg viewBox={`0 0 ${C} ${C}`} className="h-24 w-24">
            <defs>
              <linearGradient id="vsArc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#ff2bd6" />
              </linearGradient>
            </defs>
            <circle
              cx={C / 2}
              cy={C / 2}
              r={R}
              fill="none"
              stroke="#1f2a44"
              strokeWidth="4"
            />
            <circle
              cx={C / 2}
              cy={C / 2}
              r={R}
              fill="none"
              stroke="url(#vsArc)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * circ} ${circ}`}
              transform={`rotate(-90 ${C / 2} ${C / 2})`}
            />
            <g style={{ transformOrigin: "center", animation: "spin 4s linear infinite" }}>
              <circle
                cx={C / 2}
                cy={C / 2 - R}
                r="2"
                fill="#22d3ee"
              />
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-xs text-neon-cyan">
            {Math.round(pct)}%
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] text-slate-300">
            scanning <span className="text-neon-cyan">{target}</span>
          </p>
          <p className="font-mono text-[10px] text-slate-500">
            queue {TARGETS.length - 1} · adaptive · TLS+HTTP+L4
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <Stat label="Vulns" value={String(vulns)} accent="text-neon-pink" />
            <Stat label="Risk" value={`${risk}`} accent="text-neon-amber" />
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}): React.ReactElement {
  return (
    <div className="rounded border border-white/5 bg-black/40 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}
