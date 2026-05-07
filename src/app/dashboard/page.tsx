import { listRecentAlerts, listRecentEvents } from "@/lib/server/events";
import { listTraps } from "@/lib/server/honeypots";
import { listProjectsForUser } from "@/lib/server/projects";
import { requireSessionUser } from "@/lib/server/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

import type {
  AlertItem,
  DashboardStats,
  HoneypotProject,
  HoneypotTrap,
  SecurityEvent,
  ThreatSeverity,
} from "@/lib/types";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";

function computeStats(events: SecurityEvent[], traps: HoneypotTrap[]): DashboardStats {
  const ips = new Set<string>();
  let high = 0;
  for (const e of events) {
    if (e.ip) ips.add(e.ip);
    if (e.severity === "high" || e.severity === "critical") high += 1;
  }
  const honeypotHits = traps.reduce((sum, t) => sum + (t.hits ?? 0), 0);
  return {
    totalEvents: events.length,
    highSeverityEvents: high,
    honeypotHits,
    uniqueIps: ips.size,
  };
}

export default async function DashboardOverview(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const [events, traps, alerts, projects] = await Promise.all([
    listRecentEvents(100),
    listTraps(),
    listRecentAlerts(10),
    listProjectsForUser(user.uid),
  ]);
  const stats = computeStats(events, traps);

  // Recent attacker IPs per project (from in-memory events).
  const projectAttackers = new Map<string, { ip: string; lastSeen: number }[]>();
  for (const e of events) {
    const pid = (e.metadata?.projectId as string | undefined) ?? null;
    if (!pid || !e.ip) continue;
    const list = projectAttackers.get(pid) ?? [];
    if (!list.some((x) => x.ip === e.ip)) {
      list.push({ ip: e.ip, lastSeen: e.createdAt });
      projectAttackers.set(pid, list);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-sentinel-muted">
          Real-time visibility into your monitored infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Events" value={stats.totalEvents} tone="default" />
        <StatCard
          label="High Severity"
          value={stats.highSeverityEvents}
          tone="danger"
        />
        <StatCard label="Honeypot Hits" value={stats.honeypotHits} tone="warn" />
        <StatCard label="Unique IPs" value={stats.uniqueIps} tone="default" />
      </div>

      {projects.length > 0 && (
        <Panel title="Your Honeypot Projects">
          <ProjectGrid projects={projects} attackers={projectAttackers} />
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Recent Events" className="lg:col-span-2">
          <EventTable events={events.slice(0, 12)} />
        </Panel>
        <Panel title="Active Alerts">
          <AlertList alerts={alerts} />
        </Panel>
      </div>
    </div>
  );
}

function ProjectGrid({
  projects,
  attackers,
}: {
  projects: HoneypotProject[];
  attackers: Map<string, { ip: string; lastSeen: number }[]>;
}): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => {
        const ips = (attackers.get(p.id) ?? [])
          .sort((a, b) => b.lastSeen - a.lastSeen)
          .slice(0, 4);
        return (
          <Link
            key={p.id}
            href={`/dashboard/projects/${p.id}`}
            className="group rounded-xl border border-sentinel-border bg-sentinel-bg/40 p-4 transition hover:border-sentinel-accent"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-sentinel-accent">
                  {p.name}
                </p>
                <p className="text-[11px] text-sentinel-muted">
                  {p.domain ?? "no domain"}
                </p>
              </div>
              <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] text-sentinel-muted">
                {p.hits} hits
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {ips.length === 0 ? (
                <p className="text-[11px] text-sentinel-muted/70">
                  No attacker IPs in recent window.
                </p>
              ) : (
                ips.map((a) => (
                  <p
                    key={a.ip}
                    className="font-mono text-[11px] text-slate-300"
                  >
                    {a.ip}
                  </p>
                ))
              )}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-sentinel-muted group-hover:text-sentinel-accent">
              View attackers →
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "danger" | "warn";
}): React.ReactElement {
  const accent =
    tone === "danger"
      ? "text-sentinel-danger"
      : tone === "warn"
        ? "text-sentinel-warn"
        : "text-sentinel-accent";
  return (
    <div className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
      <p className="text-xs uppercase tracking-wide text-sentinel-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section
      className={`rounded-xl border border-sentinel-border bg-sentinel-panel ${className ?? ""}`}
    >
      <header className="border-b border-sentinel-border px-5 py-3">
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EventTable({
  events,
}: {
  events: SecurityEvent[];
}): React.ReactElement {
  if (events.length === 0) {
    return (
      <p className="text-sm text-sentinel-muted">No events recorded yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-sentinel-muted">
          <tr>
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Severity</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">IP</th>
            <th className="pb-2">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sentinel-border/60">
          {events.map((e) => (
            <tr key={e.id}>
              <td className="py-2 pr-4 text-sentinel-muted">
                <TimeAgo timestamp={e.createdAt} />
              </td>
              <td className="py-2 pr-4">
                <SeverityBadge severity={e.severity as ThreatSeverity} />
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-slate-300">
                {e.type}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-slate-300">
                {e.ip ?? "—"}
              </td>
              <td className="py-2 text-slate-200">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertList({
  alerts,
}: {
  alerts: AlertItem[];
}): React.ReactElement {
  if (alerts.length === 0) {
    return <p className="text-sm text-sentinel-muted">No active alerts.</p>;
  }
  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li
          key={a.id}
          className="rounded-md border border-sentinel-border bg-sentinel-bg p-3"
        >
          <div className="flex items-center justify-between">
            <SeverityBadge severity={a.severity} />
            <span className="text-xs text-sentinel-muted">
              <TimeAgo timestamp={a.createdAt} />
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-100">{a.title}</p>
          <p className="mt-1 font-mono text-xs text-sentinel-muted">
            {a.source}
          </p>
        </li>
      ))}
    </ul>
  );
}
