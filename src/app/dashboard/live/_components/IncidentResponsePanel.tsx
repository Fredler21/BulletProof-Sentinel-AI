"use client";

import { useMemo, useState } from "react";
import type { FeedItemWithCoords, LiveStats } from "./LiveCommandCenter";

export function IncidentResponsePanel({
  stats,
  items,
}: {
  stats: LiveStats | null;
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [log, setLog] = useState<string[]>([]);
  const topIp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (!it.ip) continue;
      counts.set(it.ip, (counts.get(it.ip) ?? 0) + 1);
    }
    let best: [string, number] | null = null;
    for (const e of counts) {
      if (!best || e[1] > best[1]) best = e as [string, number];
    }
    return best?.[0] ?? null;
  }, [items]);

  function pushLog(s: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    setLog((p) => [`[${ts}] ${s}`, ...p].slice(0, 6));
  }

  async function quarantine(): Promise<void> {
    if (!topIp) {
      pushLog("no candidate ip in current window");
      return;
    }
    pushLog(`quarantine request → ${topIp}`);
    try {
      const r = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ip: topIp,
          reason: "Live console quarantine",
          ttlMinutes: 60,
        }),
      });
      if (r.ok) pushLog(`✓ ${topIp} sandboxed for 60m`);
      else pushLog(`✗ blocklist api responded ${r.status}`);
    } catch {
      pushLog(`✗ network error issuing block`);
    }
  }

  return (
    <div className="glass hud-frame relative flex h-full flex-col overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
          ▎INCIDENT RESPONSE
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-neon-pink">
          AUTO-DEFENSE · ARMED
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <ActionBtn
          label="Quarantine Top Threat"
          sub={topIp ? `target → ${topIp}` : "no candidate"}
          color="pink"
          onClick={quarantine}
        />
        <ActionBtn
          label="Trigger Auto-Response"
          sub="orchestrate playbook · IR-01"
          color="cyan"
          onClick={() => pushLog("playbook IR-01 dispatched")}
        />
        <ActionBtn
          label="Escalate to Analyst"
          sub="page on-call · pri 2"
          color="purple"
          onClick={() => pushLog("on-call analyst paged")}
        />
        <ActionBtn
          label="Snapshot Forensics"
          sub={`evt window · ${items.length} items`}
          color="green"
          onClick={() => pushLog(`forensic snapshot · ${items.length} evt`)}
        />
      </div>
      <div className="mt-3 flex-1 rounded-md border border-white/5 bg-black/50 p-2 font-mono text-[10px] leading-relaxed">
        <p className="mb-1 text-slate-500">▎RESPONSE LOG</p>
        {log.length === 0 ? (
          <p className="text-slate-600">stand-by · no actions taken</p>
        ) : (
          log.map((l, i) => (
            <p key={i} className="text-neon-green">
              {l}
            </p>
          ))
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[9px] uppercase tracking-widest">
        <span className="rounded bg-neon-cyan/10 py-1 text-neon-cyan">
          BLOCKED · {stats?.blockedIps ?? 0}
        </span>
        <span className="rounded bg-neon-pink/10 py-1 text-neon-pink">
          HIGH · {stats?.highRiskSessions ?? 0}
        </span>
        <span className="rounded bg-neon-green/10 py-1 text-neon-green">
          POTS · {stats?.honeypotsDeployed ?? 0}
        </span>
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  sub,
  color,
  onClick,
}: {
  label: string;
  sub: string;
  color: "pink" | "cyan" | "purple" | "green";
  onClick: () => void;
}): React.ReactElement {
  const map = {
    pink: "border-neon-pink/40 hover:bg-neon-pink/10 text-neon-pink",
    cyan: "border-neon-cyan/40 hover:bg-neon-cyan/10 text-neon-cyan",
    purple: "border-neon-purple/40 hover:bg-neon-purple/10 text-neon-purple",
    green: "border-neon-green/40 hover:bg-neon-green/10 text-neon-green",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-md border bg-black/40 px-3 py-2 text-left transition ${map[color]}`}
    >
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest">
          {label}
        </p>
        <p className="font-mono text-[10px] text-slate-400">{sub}</p>
      </div>
      <span className="font-mono text-xs">▶</span>
    </button>
  );
}
