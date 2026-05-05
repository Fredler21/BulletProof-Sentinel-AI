"use client";

import { CyberOperator } from "./CyberOperator";

const OPERATORS: {
  callsign: string;
  role: string;
  status: "active" | "monitor" | "standby";
  variant: "alpha" | "beta" | "gamma";
}[] = [
  {
    callsign: "ARIA-07",
    role: "Threat Hunter",
    status: "active",
    variant: "alpha",
  },
  {
    callsign: "REI-12",
    role: "Incident Lead",
    status: "monitor",
    variant: "beta",
  },
  {
    callsign: "KAI-03",
    role: "Forensics",
    status: "standby",
    variant: "gamma",
  },
];

const STATUS = {
  active: { color: "text-neon-pink", dot: "bg-neon-pink", label: "ENGAGED" },
  monitor: { color: "text-neon-cyan", dot: "bg-neon-cyan", label: "MONITOR" },
  standby: { color: "text-neon-green", dot: "bg-neon-green", label: "STAND-BY" },
} as const;

export function OperatorsPanel(): React.ReactElement {
  return (
    <div className="glass holo-border hud-frame scanlines relative overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎TACTICAL OPERATORS · ONLINE
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green">
          3 / 3 SYNCED
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {OPERATORS.map((op) => {
          const s = STATUS[op.status];
          return (
            <div
              key={op.callsign}
              className="relative flex flex-col items-center rounded-xl border border-white/5 bg-black/40 p-2"
            >
              <CyberOperator variant={op.variant} className="h-32 w-full" />
              <div className="mt-1 w-full text-center">
                <p className="font-mono text-[11px] font-bold tracking-widest text-white">
                  {op.callsign}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  {op.role}
                </p>
                <p
                  className={`mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest ${s.color}`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
                  />
                  {s.label}
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
