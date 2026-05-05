import Link from "next/link";
import { listReports } from "@/lib/server/aiStore";
import { requireSessionUser } from "@/lib/server/session";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { GenerateReportButton } from "@/app/dashboard/reports/_components/GenerateReportButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const reports = await listReports(user.uid, 50);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Incident Reports</h1>
          <p className="text-sm text-sentinel-muted">
            Generate executive or technical reports from recent activity.
          </p>
        </div>
        <GenerateReportButton />
      </div>

      <ul className="space-y-3">
        {reports.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-sentinel-border bg-sentinel-panel p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-accent">
                    {r.scope}
                  </span>
                  <span className="text-xs text-sentinel-muted">
                    <TimeAgo timestamp={r.createdAt} /> · {r.model}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {r.title}
                </p>
                <p className="mt-0.5 text-xs text-sentinel-muted">
                  {r.eventCount} events · {r.scanCount} scans ·{" "}
                  <span className="text-sentinel-danger">
                    {r.highCriticalCount} high/critical
                  </span>
                </p>
              </div>
              <Link
                href={`/dashboard/reports/${r.id}`}
                className="shrink-0 text-xs text-sentinel-accent hover:underline"
              >
                Open →
              </Link>
            </div>
          </li>
        ))}
        {reports.length === 0 && (
          <li className="rounded-xl border border-dashed border-sentinel-border bg-sentinel-panel/40 p-6 text-center text-sm text-sentinel-muted">
            No reports yet. Click <span className="text-slate-200">Generate report</span> to create one.
          </li>
        )}
      </ul>
    </div>
  );
}
