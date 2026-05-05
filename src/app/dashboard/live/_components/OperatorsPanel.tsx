"use client";

import { useMemo } from "react";
import { CyberOperator } from "./CyberOperator";
import type { FeedItemWithCoords, LiveStats } from "./LiveCommandCenter";

type StatusKey = "active" | "monitor" | "standby";

interface OperatorState {
  callsign: string;
  role: string;
  domain: string;
  variant: "alpha" | "beta" | "gamma";
  status: StatusKey;
  metric: string;
  detail: string;
}

const STATUS = {
  active: {
    color: "text-neon-pink",
    dot: "bg-neon-pink",
    ring: "border-neon-pink/60 shadow-neon-pink",
    label: "ENGAGED",
  },
  monitor: {
    color: "text-neon-cyan",
    dot: "bg-neon-cyan",
    ring: "border-neon-cyan/40 shadow-neon-cyan",
    label: "MONITOR",
  },
  standby: {
    color: "text-neon-green",
    dot: "bg-neon-green",
    ring: "border-neon-green/30",
    label: "STAND-BY",
  },
} as const;

function pick(count: number, hi: number, lo: number): StatusKey {
  if (count >= hi) return "active";
  if (count >= lo) return "monitor";
  return "standby";
}

export function OperatorsPanel({
  stats,
  items,
}: {
  stats: LiveStats | null;
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const operators = useMemo<OperatorState[]>(() => {
    // Domain breakdown — each operator owns a slice of the live telemetry.
    const highSev = items.filter(
      (i) => i.severity === "high" || i.severity === "critical",
    ).length;
    const honeyEvents = items.filter(
      (i) => i.type === "honeypot.trigger" || i.type === "auth.login.failure",
    ).length;
    const activeAttackers = stats?.activeAttackers ?? 0;
    const highRisk = stats?.highRiskSessions ?? 0;
    const honeyEng = stats?.honeypotEngagements ?? 0;

    return [
      {
        callsign: "ARIA-07",
        role: "Threat Hunter",
        domain: "Live Feed",
        variant: "alpha",
        status: pick(highSev, 5, 1),
        metric: `${highSev} hi-sev`,
        detail: `${activeAttackers} active attackers tracked`,
      },
      {
        callsign: "REI-12",
        role: "Incident Lead",
        domain: "Incidents",
        variant: "beta",
        status: pick(highRisk, 3, 1),
        metric: `${highRisk} hi-risk`,
        detail: `risk score ${stats?.riskScore ?? 0}/100`,
      },
      {
        callsign: "KAI-03",
        role: "Forensics",
        domain: "Honeypots · TTY",
        variant: "gamma",
        status: pick(honeyEvents + honeyEng, 4, 1),
        metric: `${honeyEng} engagements`,
        detail: `${honeyEvents} session events buffered`,
      },
    ];
  }, [items, stats]);

  const synced = operators.filter((o) => o.status !== "standby").length;
  return (
    <div className="glass holo-border hud-frame scanlines relative overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎TACTICAL OPERATORS · ONLINE
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green">
          {synced} / {operators.length} ACTIVE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {operators.map((op) => {
          const s = STATUS[op.status];
          const isActive = op.status === "active";
          return (
            <div
              key={op.callsign}
              className={`relative flex flex-col items-center rounded-xl border bg-black/40 p-2 transition ${s.ring} ${
                isActive ? "glow-pulse" : ""
              }`}
            >
              <CyberOperator variant={op.variant} className="h-32 w-full" />
              <div className="mt-1 w-full text-center">
                <p className="font-mono text-[11px] font-bold tracking-widest text-white">
                  {op.callsign}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  {op.role}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                  ▎{op.domain}
                </p>
                <p
                  className={`mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest ${s.color}`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} ${
                      isActive ? "animate-ping" : ""
                    }`}
                  />
                  {s.label}
                </p>
                <p
                  className={`mt-1 font-mono text-[9px] tracking-widest ${s.color}`}
                >
                  {op.metric}
                </p>
                <p className="font-mono text-[9px] text-slate-500">
                  {op.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">
        ▎comms encrypted · post-quantum lattice · channel Σ-7
      </p>
    </div>
  );
}
