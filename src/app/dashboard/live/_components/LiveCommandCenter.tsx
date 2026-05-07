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

const POLL_FEED = 15_000;
const POLL_STATS = 30_000;

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

  // When a project filter is active, derive stats from the filtered items so
  // every panel (KPIs, gauge, scanner) reflects only those projects instead of
  // global counts that would otherwise look like nothing changed.
  const effectiveStats = useMemo<LiveStats | null>(() => {
    if (selectedProjects.length === 0) return stats;
    if (!stats) return null;
    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = filteredItems.filter((i) => i.createdAt >= oneDayAgo);
    const ips = new Set(recent.map((i) => i.ip).filter(Boolean) as string[]);
    const high = recent.filter(
      (i) => i.severity === "high" || i.severity === "critical",
    ).length;
    const honey = recent.filter((i) => i.type?.startsWith("honeypot")).length;
    const cmds = recent.filter((i) => i.type === "honeypot.trigger").length;
    const epm = filteredItems.filter((i) => i.createdAt >= oneMinAgo).length;
    const riskScore = Math.min(
      100,
      Math.round(high * 8 + honey * 3 + ips.size * 2),
    );
    return {
      ...stats,
      activeAttackers: ips.size,
      connectionsToday: recent.length,
      uniqueIps: ips.size,
      highRiskSessions: high,
      vulnsDetected: 0,
      honeypotEngagements: honey,
      commandsExecuted: cmds,
      riskScore,
      eventsPerMinute: epm,
    };
  }, [stats, filteredItems, selectedProjects]);

  useEffect(() => {
    let alive = true;
    async function pull(): Promise<void> {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch("/api/live/feed?limit=60", {
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
      if (typeof document !== "undefined" && document.hidden) return;
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
      <TopStatusBar stats={effectiveStats} />

      {/* Project filter (1, 2, or 3 projects at once) */}
      <ProjectFilterBar
        selected={selectedProjects}
        onChange={setSelectedProjects}
        liveCounts={liveCounts}
        maxSelectable={3}
      />

      {selectedProjects.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-sentinel-accent/40 bg-sentinel-accent/5 px-3 py-2 text-xs text-sentinel-accent">
          <span>
            🔎 Live console scoped to {selectedProjects.length} project
            {selectedProjects.length > 1 ? "s" : ""} · showing{" "}
            {filteredItems.length} of {items.length} events
          </span>
          <button
            type="button"
            onClick={() => setSelectedProjects([])}
            className="rounded border border-sentinel-accent/40 px-2 py-0.5 text-[11px] hover:bg-sentinel-accent/10"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* KPI strip */}
      <LiveStatsGrid stats={effectiveStats} />

      {/* Row 1: Operators · Map · Gauge+Scanner */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <OperatorsPanel stats={effectiveStats} items={filteredItems} />
        </div>
        <div className="xl:col-span-6">
          <WorldMap items={filteredItems} />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-3">
          <RiskGauge stats={effectiveStats} />
          <VulnScannerWidget stats={effectiveStats} />
        </div>
      </div>

      {/* Row 2: AI · Live feed · Honeypots */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AIIntelStrip stats={effectiveStats} items={filteredItems} />
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
        <IncidentResponsePanel stats={effectiveStats} items={filteredItems} />
      </div>

      {/* Floating alerts */}
      <FloatingAlerts items={filteredItems} />
    </div>
  );
}
