import { listBlockedIps } from "@/lib/server/blocklist";
import { requireSessionUser } from "@/lib/server/session";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { BlocklistActions } from "@/app/dashboard/blocklist/_components/BlocklistActions";
import { UnblockButton } from "@/app/dashboard/blocklist/_components/UnblockButton";

export const dynamic = "force-dynamic";

export default async function BlocklistPage(): Promise<React.ReactElement> {
  await requireSessionUser();
  const blocks = await listBlockedIps();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">IP Blocklist</h1>
        <p className="text-sm text-sentinel-muted">
          IPs blocked from honeypot endpoints. Auto-block fires after repeated
          honeypot triggers or failed logins.
        </p>
      </div>

      <BlocklistActions />

      <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
            <tr>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Hits</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sentinel-border/60">
            {blocks.map((b) => (
              <tr key={b.ip}>
                <td className="px-4 py-2 font-mono text-xs text-sentinel-accent">
                  {b.ip}
                </td>
                <td className="px-4 py-2 text-slate-200">{b.reason}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-sentinel-muted">
                  {b.source}
                </td>
                <td className="px-4 py-2 text-xs text-sentinel-muted">
                  <TimeAgo timestamp={b.createdAt} />
                </td>
                <td className="px-4 py-2 text-xs text-sentinel-muted">
                  {b.expiresAt
                    ? new Date(b.expiresAt).toLocaleString()
                    : "permanent"}
                </td>
                <td className="px-4 py-2 text-xs text-slate-300">{b.hits}</td>
                <td className="px-4 py-2 text-right">
                  <UnblockButton ip={b.ip} />
                </td>
              </tr>
            ))}
            {blocks.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-sentinel-muted"
                >
                  No IPs are currently blocked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
