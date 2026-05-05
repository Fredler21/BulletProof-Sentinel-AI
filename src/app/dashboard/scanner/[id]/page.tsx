import { notFound } from "next/navigation";
import Link from "next/link";
import { getScan } from "@/lib/server/scanner";
import { requireSessionUser } from "@/lib/server/session";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const { id } = await params;
  const scan = await getScan(id, user.uid);
  if (!scan) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/scanner"
        className="text-xs text-sentinel-accent hover:underline"
      >
        ← Back to scanner
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{scan.hostname}</h1>
          <p className="mt-1 font-mono text-xs text-sentinel-muted">{scan.url}</p>
          <p className="mt-1 text-xs text-sentinel-muted">
            Scanned <TimeAgo timestamp={scan.createdAt} /> · {scan.durationMs}ms
            · HTTP {scan.statusCode ?? "n/a"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SeverityBadge severity={scan.severity} />
          <p className="text-3xl font-semibold text-white">
            {scan.score}
            <span className="ml-1 text-xs font-normal text-sentinel-muted">
              / 100 risk
            </span>
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
          Findings ({scan.findings.length})
        </h2>
        {scan.findings.length === 0 ? (
          <div className="rounded-xl border border-sentinel-ok/30 bg-sentinel-ok/5 p-5 text-sm text-sentinel-ok">
            No issues detected. Keep monitoring this asset regularly.
          </div>
        ) : (
          <ul className="space-y-3">
            {scan.findings.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-sentinel-border bg-sentinel-panel p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-muted">
                      {f.category}
                    </span>
                  </div>
                  <span className="text-xs text-sentinel-muted">
                    +{f.score} score
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">
                  {f.title}
                </p>
                <p className="mt-1 text-xs text-sentinel-muted">{f.detail}</p>
                <p className="mt-2 text-xs text-slate-300">
                  <span className="text-sentinel-accent">Recommendation:</span>{" "}
                  {f.recommendation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
          Response Headers
        </h2>
        <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-sentinel-border/60 font-mono">
              {Object.entries(scan.responseHeaders).map(([k, v]) => (
                <tr key={k}>
                  <td className="w-1/3 px-4 py-2 text-sentinel-muted">{k}</td>
                  <td className="break-all px-4 py-2 text-slate-200">{v}</td>
                </tr>
              ))}
              {Object.keys(scan.responseHeaders).length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-center text-sentinel-muted"
                  >
                    No headers captured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
