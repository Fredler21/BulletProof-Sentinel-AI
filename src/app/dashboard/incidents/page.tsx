import Link from "next/link";
import { requireSessionUser } from "@/lib/server/session";
import { correlateRecentIncidents } from "@/lib/server/correlation";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";

export const dynamic = "force-dynamic";

export default async function IncidentsPage(): Promise<React.ReactElement> {
  await requireSessionUser();
  const incidents = await correlateRecentIncidents();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Threat Incidents</h1>
        <p className="text-sm text-sentinel-muted">
          Correlated clusters of related security events. Grouped by source IP
          inside a 30-minute rolling window.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Source IP</th>
              <th className="px-4 py-3">Events</th>
              <th className="px-4 py-3">Types</th>
              <th className="px-4 py-3">First seen</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sentinel-border/60">
            {incidents.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2">
                  <SeverityBadge severity={i.severity} />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-sentinel-accent">
                  {i.ip ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-200">{i.eventCount}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {i.eventTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-sentinel-bg px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-sentinel-muted">
                  <TimeAgo timestamp={i.firstSeenAt} />
                </td>
                <td className="px-4 py-2 text-xs text-sentinel-muted">
                  <TimeAgo timestamp={i.lastSeenAt} />
                </td>
                <td className="px-4 py-2 text-right">
                  {i.ip && (
                    <Link
                      href={`/dashboard/blocklist`}
                      className="text-xs text-sentinel-accent hover:underline"
                    >
                      Block →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-sentinel-muted"
                >
                  No correlated incidents in the recent window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
