import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/server/aiStore";
import { requireSessionUser } from "@/lib/server/session";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { renderMarkdown } from "@/lib/server/markdown";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const { id } = await params;
  const report = await getReport(id, user.uid);
  if (!report) notFound();

  const html = renderMarkdown(report.body);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/reports"
        className="text-xs text-sentinel-accent hover:underline"
      >
        ← Back to reports
      </Link>
      <header>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-accent">
            {report.scope}
          </span>
          <span className="text-xs text-sentinel-muted">
            <TimeAgo timestamp={report.createdAt} /> · {report.model}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          {report.title}
        </h1>
        <p className="mt-1 text-xs text-sentinel-muted">
          Range: {new Date(report.rangeFrom).toLocaleString()} →{" "}
          {new Date(report.rangeTo).toLocaleString()} · {report.eventCount} events ·{" "}
          {report.scanCount} scans ·{" "}
          <span className="text-sentinel-danger">
            {report.highCriticalCount} high/critical
          </span>
        </p>
      </header>
      <article
        className="report-body rounded-xl border border-sentinel-border bg-sentinel-panel p-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
