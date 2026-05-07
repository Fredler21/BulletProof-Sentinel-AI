import { listRecentEvents } from "@/lib/server/events";
import { getGeoForIps } from "@/lib/server/geoip";
import { listProjectsForUser } from "@/lib/server/projects";
import { requireSessionUser } from "@/lib/server/session";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import Link from "next/link";

export const dynamic = "force-dynamic";

function flagFromCountryCode(cc: string | null): string {
  if (!cc || cc.length !== 2) return "";
  const base = 0x1f1e6;
  const code = cc.toUpperCase();
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65,
  );
}

export default async function EventsPage(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const [events, projects] = await Promise.all([
    listRecentEvents(200),
    listProjectsForUser(user.uid),
  ]);
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const ips = events.map((e) => e.ip).filter((ip): ip is string => Boolean(ip));
  const geo = await getGeoForIps(ips);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Security Events</h1>
        <p className="text-sm text-sentinel-muted">
          Latest events captured across your monitored systems. Click a project
          name to drill into its attackers.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Origin</th>
              <th className="px-4 py-3">User Agent</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sentinel-border/60">
            {events.map((e) => {
              const g = e.ip ? geo.get(e.ip) : null;
              const pid = (e.metadata?.projectId as string | undefined) ?? null;
              const project = pid ? projectMap.get(pid) : null;
              return (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-sentinel-muted">
                    <TimeAgo timestamp={e.createdAt} />
                  </td>
                  <td className="px-4 py-2">
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {project ? (
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="text-sentinel-accent hover:underline"
                      >
                        {project.name}
                      </Link>
                    ) : pid ? (
                      <span className="text-sentinel-muted">{pid.slice(0, 8)}…</span>
                    ) : (
                      <span className="text-sentinel-muted/60">local</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.type}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-300">
                    {e.route ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-300">
                    {e.ip ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-300">
                    {g ? (
                      <span>
                        <span className="mr-1">
                          {flagFromCountryCode(g.countryCode)}
                        </span>
                        {[g.city, g.country].filter(Boolean).join(", ") || "—"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[18rem] truncate px-4 py-2 text-xs text-sentinel-muted">
                    {e.userAgent ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-200">{e.message}</td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-sm text-sentinel-muted"
                >
                  No events yet. Trigger a honeypot or sign in to generate one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
