import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/server/session";
import { findProjectById } from "@/lib/server/projects";
import { listEventsForProject } from "@/lib/server/events";
import { getGeoForIps } from "@/lib/server/geoip";
import { listBlockedIps } from "@/lib/server/blocklist";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { BlockIpButton } from "@/app/dashboard/projects/_components/BlockIpButton";
import type { SecurityEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageCtx {
  params: Promise<{ id: string }>;
}

function flag(cc: string | null): string {
  if (!cc || cc.length !== 2) return "";
  const base = 0x1f1e6;
  const code = cc.toUpperCase();
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65,
  );
}

interface AttackerSummary {
  ip: string;
  hits: number;
  lastSeenAt: number;
  firstSeenAt: number;
  routes: Set<string>;
  userAgents: Set<string>;
  highSeverityHits: number;
  credentialAttempts: number;
}

function summarizeAttackers(events: SecurityEvent[]): AttackerSummary[] {
  const map = new Map<string, AttackerSummary>();
  for (const e of events) {
    if (!e.ip) continue;
    let s = map.get(e.ip);
    if (!s) {
      s = {
        ip: e.ip,
        hits: 0,
        lastSeenAt: 0,
        firstSeenAt: e.createdAt,
        routes: new Set(),
        userAgents: new Set(),
        highSeverityHits: 0,
        credentialAttempts: 0,
      };
      map.set(e.ip, s);
    }
    s.hits++;
    s.lastSeenAt = Math.max(s.lastSeenAt, e.createdAt);
    s.firstSeenAt = Math.min(s.firstSeenAt, e.createdAt);
    if (e.route) s.routes.add(e.route);
    if (e.userAgent) s.userAgents.add(e.userAgent);
    if (e.severity === "high" || e.severity === "critical") s.highSeverityHits++;
    if (e.type === "honeypot.credentials") s.credentialAttempts++;
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

export default async function ProjectDetailPage(
  ctx: PageCtx,
): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const { id } = await ctx.params;
  const project = await findProjectById(id);
  if (!project || project.ownerUid !== user.uid) {
    notFound();
  }

  const events = await listEventsForProject(id, 500);
  const attackers = summarizeAttackers(events);
  const ips = attackers.map((a) => a.ip);
  const [geo, blocks] = await Promise.all([
    getGeoForIps(ips),
    listBlockedIps(),
  ]);
  const blockedSet = new Set(blocks.map((b) => b.ip));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-sentinel-muted">
            <Link
              href="/dashboard/projects"
              className="hover:text-sentinel-accent"
            >
              ← Embed API projects
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {project.name}
          </h1>
          <p className="text-sm text-sentinel-muted">
            {project.domain ?? "No domain configured"} ·{" "}
            <span className="font-mono text-xs">{project.id}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Total hits" value={project.hits} />
          <Stat label="Attackers" value={attackers.length} />
          <Stat label="Credential attempts" value={attackers.reduce((s, a) => s + a.credentialAttempts, 0)} tone="danger" />
        </div>
      </div>

      {attackers.length === 0 ? (
        <div className="rounded-xl border border-sentinel-border bg-sentinel-panel p-6 text-sm text-sentinel-muted">
          No hits yet. Once your trap URL or beacon receives traffic, attackers
          will appear here grouped by IP.
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
            Attackers ({attackers.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
                <tr>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3">Hits</th>
                  <th className="px-4 py-3">High-sev</th>
                  <th className="px-4 py-3">Cred attempts</th>
                  <th className="px-4 py-3">Routes touched</th>
                  <th className="px-4 py-3">First seen</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sentinel-border/60">
                {attackers.map((a) => {
                  const g = geo.get(a.ip);
                  return (
                    <tr key={a.ip}>
                      <td className="px-4 py-2 font-mono text-xs text-sentinel-accent">
                        {a.ip}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-300">
                        {g ? (
                          <>
                            <span className="mr-1">{flag(g.countryCode)}</span>
                            {[g.city, g.country].filter(Boolean).join(", ") || "—"}
                            {g.org && (
                              <span className="block text-[10px] text-sentinel-muted">
                                {g.org}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-white">
                        {a.hits}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-red-300">
                        {a.highSeverityHits}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-amber-300">
                        {a.credentialAttempts}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-300">
                        <div className="max-w-xs space-y-0.5">
                          {[...a.routes].slice(0, 4).map((r) => (
                            <div key={r} className="font-mono text-[11px]">
                              {r}
                            </div>
                          ))}
                          {a.routes.size > 4 && (
                            <div className="text-[10px] text-sentinel-muted">
                              +{a.routes.size - 4} more
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-sentinel-muted">
                        <TimeAgo timestamp={a.firstSeenAt} />
                      </td>
                      <td className="px-4 py-2 text-xs text-sentinel-muted">
                        <TimeAgo timestamp={a.lastSeenAt} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <BlockIpButton
                          ip={a.ip}
                          reason={`From project ${project.name}`}
                          initiallyBlocked={blockedSet.has(a.ip)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
            Recent events ({events.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">User Agent</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sentinel-border/60">
                {events.slice(0, 100).map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-sentinel-muted">
                      <TimeAgo timestamp={e.createdAt} />
                    </td>
                    <td className="px-4 py-2">
                      <SeverityBadge severity={e.severity} />
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px]">{e.type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-300">
                      {e.ip ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-300">
                      {e.route ?? "—"}
                    </td>
                    <td className="max-w-[18rem] truncate px-4 py-2 text-[11px] text-sentinel-muted">
                      {e.userAgent ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-200">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}): React.ReactElement {
  const accent = tone === "danger" ? "text-sentinel-danger" : "text-sentinel-accent";
  return (
    <div className="rounded-xl border border-sentinel-border bg-sentinel-panel px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-sentinel-muted">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
