"use client";

import { useEffect, useState } from "react";
import type { LiveFeedItem } from "@/app/api/live/feed/route";
import { LiveStatsGrid } from "./LiveStatsGrid";
import { LiveFeed } from "./LiveFeed";
import { WorldMap } from "./WorldMap";
import { HoneypotSessions } from "./HoneypotSessions";
import { AIIntelStrip } from "./AIIntelStrip";

export interface LiveStats {
  activeAttackers: number;
  connectionsToday: number;
  uniqueIps: number;
  highRiskSessions: number;
  vulnsDetected: number;
  honeypotEngagements: number;
  commandsExecuted: number;
  riskScore: number;
  blockedIps: number;
  honeypotsDeployed: number;
  eventsPerMinute: number;
  serverTime: number;
}

export type FeedItemWithCoords = LiveFeedItem & {
  coords: { lat: number; lon: number } | null;
};

const POLL_FEED = 4_000;
const POLL_STATS = 5_000;

export function LiveCommandCenter(): React.ReactElement {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [items, setItems] = useState<FeedItemWithCoords[]>([]);

  useEffect(() => {
    let alive = true;
    async function pull(): Promise<void> {
      try {
        const r = await fetch("/api/live/feed?limit=60", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { items: FeedItemWithCoords[] };
        if (alive) setItems(d.items);
      } catch {
        /* ignore */
      }
    }
    void pull();
    const t = setInterval(pull, POLL_FEED);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function pull(): Promise<void> {
      try {
        const r = await fetch("/api/live/stats", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as LiveStats;
        if (alive) setStats(d);
      } catch {
        /* ignore */
      }
    }
    void pull();
    const t = setInterval(pull, POLL_STATS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.25rem)] bg-[radial-gradient(ellipse_at_top,_#0c1430_0%,_#04060d_55%,_#02030a_100%)] p-6">
      <CommandHeader stats={stats} />

      <div className="mt-4">
        <LiveStatsGrid stats={stats} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WorldMap items={items} />
        </div>
        <div>
          <LiveFeed items={items} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HoneypotSessions items={items} />
        <AIIntelStrip stats={stats} items={items} />
      </div>
    </div>
  );
}

function CommandHeader({
  stats,
}: {
  stats: LiveStats | null;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neon-cyan/30 bg-black/40 px-4 py-3 shadow-neon-cyan">
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-neon-green/70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-neon-green shadow-neon-green" />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon-cyan">
            Sentinel · Live Defense Console
          </p>
          <p className="font-mono text-xs text-slate-400">
            REAL-TIME · {stats ? `${stats.eventsPerMinute} EVT/MIN` : "syncing…"}{" "}
            · srv {stats ? new Date(stats.serverTime).toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase">
        <Badge color="cyan">SOC ONLINE</Badge>
        <Badge color="pink">AUTO-DEFENSE</Badge>
        <Badge color="green">HONEYPOTS ARMED</Badge>
      </div>
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "cyan" | "pink" | "green";
  children: React.ReactNode;
}): React.ReactElement {
  const map = {
    cyan: "border-neon-cyan/40 text-neon-cyan shadow-neon-cyan",
    pink: "border-neon-pink/40 text-neon-pink shadow-neon-pink",
    green: "border-neon-green/40 text-neon-green shadow-neon-green",
  } as const;
  return (
    <span
      className={`rounded border bg-black/40 px-2 py-0.5 tracking-widest ${map[color]}`}
    >
      {children}
    </span>
  );
}
