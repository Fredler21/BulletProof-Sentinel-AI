"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveFeedItem } from "@/app/api/live/feed/route";
import { LiveStatsGrid } from "./LiveStatsGrid";
import { ProjectFilterBar } from "./ProjectFilterBar";
import { LiveFeed } from "./LiveFeed";
import { WorldMap } from "./WorldMap";
import { HoneypotSessions } from "./HoneypotSessions";
import { AIIntelStrip } from "./AIIntelStrip";
import { TopStatusBar } from "./TopStatusBar";
import { OperatorsPanel } from "./OperatorsPanel";
import { RiskGauge } from "./RiskGauge";
import { VulnScannerWidget } from "./VulnScannerWidget";
import { AttackTimeline } from "./AttackTimeline";
import { HeatmapGrid } from "./HeatmapGrid";
import { TerminalConsole } from "./TerminalConsole";
import { IncidentResponsePanel } from "./IncidentResponsePanel";
import { FloatingAlerts } from "./FloatingAlerts";
import { SuspiciousIpTracker } from "./SuspiciousIpTracker";

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
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const liveCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) {
      if (it.projectId) map[it.projectId] = (map[it.projectId] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedProjects.length === 0) return items;
    const set = new Set(selectedProjects);
    return items.filter((it) => it.projectId && set.has(it.projectId));
  }, [items, selectedProjects]);

  useEffect(() => {
    let alive = true;
    async function pull(): Promise<void> {
      try {
        const r = await fetch("/api/live/feed?limit=120", {
          cache: "no-store",
        });
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
    <div className="relative flex flex-col gap-4">
      {/* HUD top bar */}
      <TopStatusBar stats={stats} />

      {/* Project filter (1, 2, or 3 projects at once) */}
      <ProjectFilterBar
        selected={selectedProjects}
        onChange={setSelectedProjects}
        liveCounts={liveCounts}
        maxSelectable={3}
      />

      {/* KPI strip */}
      <LiveStatsGrid stats={stats} />

      {/* Row 1: Operators · Map · Gauge+Scanner */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <OperatorsPanel stats={stats} items={filteredItems} />
        </div>
        <div className="xl:col-span-6">
          <WorldMap items={filteredItems} />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-3">
          <RiskGauge stats={stats} />
          <VulnScannerWidget stats={stats} />
        </div>
      </div>

      {/* Row 2: AI · Live feed · Honeypots */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AIIntelStrip stats={stats} items={filteredItems} />
        <LiveFeed items={filteredItems} />
        <HoneypotSessions items={filteredItems} />
      </div>

      {/* Row 3: Timeline + Heatmap */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AttackTimeline items={filteredItems} />
        <HeatmapGrid items={filteredItems} />
      </div>

      {/* Row 3.5: Suspicious IP Tracker (full width) */}
      <SuspiciousIpTracker items={filteredItems} />

      {/* Row 4: Terminal + Incident Response */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TerminalConsole items={filteredItems} />
        </div>
        <IncidentResponsePanel stats={stats} items={filteredItems} />
      </div>

      {/* Floating alerts */}
      <FloatingAlerts items={filteredItems} />
    </div>
  );
}
