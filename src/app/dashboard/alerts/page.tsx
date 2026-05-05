import Link from "next/link";
import { listRecentAlerts } from "@/lib/server/events";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import type { AlertStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: AlertStatus }): React.ReactElement {
  const map: Record<AlertStatus, string> = {
    open: "border-sentinel-danger/40 bg-sentinel-danger/10 text-sentinel-danger",
    investigating:
      "border-sentinel-warn/40 bg-sentinel-warn/10 text-sentinel-warn",
    resolved: "border-sentinel-ok/40 bg-sentinel-ok/10 text-sentinel-ok",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${map[status]}`}
    >
      {status}
    </span>
  );
}

export default async function AlertsPage(): Promise<React.ReactElement> {
  const alerts = await listRecentAlerts(100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Alerts</h1>
        <p className="text-sm text-sentinel-muted">
          High and critical severity events surfaced for review. Click an alert
          to investigate, assign, or add notes.
        </p>
      </div>

      <ul className="space-y-3">
        {alerts.map((a) => {
          const status: AlertStatus = a.status ?? "open";
          return (
            <li
              key={a.id}
              className="rounded-xl border border-sentinel-border bg-sentinel-panel transition hover:border-sentinel-accent/40"
            >
              <Link href={`/dashboard/alerts/${a.id}`} className="block p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <StatusPill status={status} />
                      <span className="text-xs text-sentinel-muted">
                        <TimeAgo timestamp={a.createdAt} />
                      </span>
                      {a.acknowledged && (
                        <span className="rounded-full border border-sentinel-ok/40 bg-sentinel-ok/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-ok">
                          Acknowledged
                        </span>
                      )}
                      {a.assigneeUid && (
                        <span className="rounded-full bg-sentinel-bg px-2 py-0.5 text-[10px] text-slate-300">
                          @{a.assigneeName ?? a.assigneeUid.slice(0, 8)}
                        </span>
                      )}
                      {(a.notesCount ?? 0) > 0 && (
                        <span className="rounded-full bg-sentinel-bg px-2 py-0.5 text-[10px] text-slate-300">
                          {a.notesCount} notes
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-100">
                      {a.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-sentinel-muted">
                      {a.source}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-sentinel-accent">
                    Open →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {alerts.length === 0 && (
          <li className="rounded-xl border border-sentinel-border bg-sentinel-panel p-6 text-center text-sm text-sentinel-muted">
            No alerts yet.
          </li>
        )}
      </ul>
    </div>
  );
}
