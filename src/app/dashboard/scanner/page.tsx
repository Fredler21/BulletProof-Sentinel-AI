import { listAssets } from "@/lib/server/assets";
import { listRecentScans } from "@/lib/server/scanner";
import { requireSessionUser } from "@/lib/server/session";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { ScannerActions } from "@/app/dashboard/scanner/_components/ScannerActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ScannerPage(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const [assets, scans] = await Promise.all([
    listAssets(user.uid),
    listRecentScans(user.uid, 25),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Vulnerability Scanner</h1>
        <p className="text-sm text-sentinel-muted">
          Add an approved asset, then run a scan to analyze TLS, security headers,
          cookies, CORS, and exposed paths.
        </p>
      </div>

      <ScannerActions assets={assets} />

      <section className="rounded-xl border border-sentinel-border bg-sentinel-panel">
        <header className="border-b border-sentinel-border px-5 py-3">
          <h2 className="text-sm font-medium text-white">Recent Scans</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-sentinel-muted">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Findings</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentinel-border/60">
              {scans.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-2 text-sentinel-muted">
                    <TimeAgo timestamp={s.createdAt} />
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-200">
                    {s.hostname}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs">
                    {s.statusCode ?? "—"}
                  </td>
                  <td className="px-5 py-2">
                    <SeverityBadge severity={s.severity} />
                  </td>
                  <td className="px-5 py-2 font-semibold text-white">
                    {s.score}
                  </td>
                  <td className="px-5 py-2 text-slate-300">
                    {s.findings.length}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Link
                      href={`/dashboard/scanner/${s.id}`}
                      className="text-xs text-sentinel-accent hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {scans.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-6 text-center text-sm text-sentinel-muted"
                  >
                    No scans yet. Add an asset and run your first scan.
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
