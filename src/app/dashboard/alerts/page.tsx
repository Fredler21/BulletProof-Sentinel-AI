import { listRecentAlerts } from "@/lib/server/events";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { AcknowledgeButton } from "@/app/dashboard/alerts/_components/AcknowledgeButton";

export const dynamic = "force-dynamic";


export default async function AlertsPage(): Promise<React.ReactElement> {
  const alerts = await listRecentAlerts(100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Alerts</h1>
        <p className="text-sm text-sentinel-muted">
          High and critical severity events surfaced for review.
        </p>
      </div>

      <ul className="space-y-3">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-sentinel-border bg-sentinel-panel p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={a.severity} />
                <span className="text-xs text-sentinel-muted">
                  <TimeAgo timestamp={a.createdAt} />
                </span>
                {a.acknowledged && (
                  <span className="rounded-full border border-sentinel-ok/40 bg-sentinel-ok/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-ok">
                    Acknowledged
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-slate-100">{a.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-sentinel-muted">
                {a.source}
              </p>
            </div>
            {!a.acknowledged && <AcknowledgeButton id={a.id} />}
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="rounded-xl border border-sentinel-border bg-sentinel-panel p-6 text-center text-sm text-sentinel-muted">
            No alerts yet.
          </li>
        )}
      </ul>
    </div>
  );
}
