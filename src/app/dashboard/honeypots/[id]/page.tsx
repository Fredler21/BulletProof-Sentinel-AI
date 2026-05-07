import Link from "next/link";
import { notFound } from "next/navigation";
import { listTraps } from "@/lib/server/honeypots";
import { listEventsForRoute } from "@/lib/server/events";
import { listBlockedIps } from "@/lib/server/blocklist";
import { BlockIpButton } from "@/app/dashboard/alerts/_components/BlockIpButton";
import type { SecurityEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

interface IpRollup {
  ip: string;
  hits: number;
  firstSeen: number;
  lastSeen: number;
  lastUserAgent: string | null;
  credentialAttempts: number;
  sampleUsernames: string[];
}

function rollupByIp(events: SecurityEvent[]): IpRollup[] {
  const map = new Map<string, IpRollup>();
  for (const e of events) {
    const ip = e.ip ?? "unknown";
    const existing = map.get(ip);
    const username =
      typeof e.metadata?.username === "string" ? e.metadata.username : null;
    if (!existing) {
      map.set(ip, {
        ip,
        hits: 1,
        firstSeen: e.createdAt,
        lastSeen: e.createdAt,
        lastUserAgent: e.userAgent,
        credentialAttempts: e.type === "honeypot.credentials" ? 1 : 0,
        sampleUsernames: username ? [username] : [],
      });
    } else {
      existing.hits += 1;
      existing.firstSeen = Math.min(existing.firstSeen, e.createdAt);
      if (e.createdAt > existing.lastSeen) {
        existing.lastSeen = e.createdAt;
        existing.lastUserAgent = e.userAgent;
      }
      if (e.type === "honeypot.credentials") existing.credentialAttempts += 1;
      if (
        username &&
        existing.sampleUsernames.length < 3 &&
        !existing.sampleUsernames.includes(username)
      ) {
        existing.sampleUsernames.push(username);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default async function HoneypotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const traps = await listTraps();
  const trap = traps.find((t) => t.id === id);
  if (!trap) notFound();

  // Pull both honeypot.trigger and honeypot.credentials events for this path.
  const events = await listEventsForRoute(trap.path, 150);
  const ips = rollupByIp(events);

  const blocked = await listBlockedIps();
  const blockedSet = new Set(blocked.map((b) => b.ip));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/honeypots"
          className="text-xs uppercase tracking-wide text-sentinel-muted hover:text-sentinel-accent"
        >
          ← All honeypots
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{trap.name}</h1>
        <p className="text-sm text-sentinel-muted">{trap.description}</p>
        <p className="mt-2 font-mono text-xs text-sentinel-accent">
          {trap.path}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total hits" value={String(trap.hits)} />
        <Stat label="Unique IPs" value={String(ips.length)} />
        <Stat
          label="Credential attempts"
          value={String(
            ips.reduce((sum, r) => sum + r.credentialAttempts, 0),
          )}
        />
      </div>

      <div className="rounded-xl border border-sentinel-border bg-sentinel-panel">
        <div className="border-b border-sentinel-border px-5 py-3">
          <h2 className="text-sm font-semibold text-white">
            Attackers caught by this trap
          </h2>
          <p className="text-xs text-sentinel-muted">
            Click <strong>Block IP</strong> to drop a 24h block. Already-blocked
            IPs are marked.
          </p>
        </div>
        {ips.length === 0 ? (
          <div className="p-8 text-center text-sm text-sentinel-muted">
            No one has tripped this trap yet. Lucky you.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-sentinel-muted">
              <tr>
                <th className="px-5 py-2">IP</th>
                <th className="px-5 py-2">Hits</th>
                <th className="px-5 py-2">Creds</th>
                <th className="px-5 py-2">Last seen</th>
                <th className="px-5 py-2">User-Agent</th>
                <th className="px-5 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((r) => (
                <tr
                  key={r.ip}
                  className="border-t border-sentinel-border/60 align-top"
                >
                  <td className="px-5 py-3 font-mono text-xs text-white">
                    {r.ip}
                    {r.sampleUsernames.length > 0 && (
                      <div className="mt-1 text-[10px] text-sentinel-muted">
                        tried: {r.sampleUsernames.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-white">{r.hits}</td>
                  <td className="px-5 py-3 text-white">
                    {r.credentialAttempts}
                  </td>
                  <td className="px-5 py-3 text-xs text-sentinel-muted">
                    {formatRelative(r.lastSeen)}
                  </td>
                  <td className="px-5 py-3 max-w-[280px] truncate text-xs text-sentinel-muted">
                    {r.lastUserAgent ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.ip === "unknown" ? (
                      <span className="text-[10px] uppercase text-sentinel-muted">
                        n/a
                      </span>
                    ) : blockedSet.has(r.ip) ? (
                      <span className="rounded-md border border-sentinel-danger/40 bg-sentinel-danger/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-danger">
                        Blocked
                      </span>
                    ) : (
                      <BlockIpButton
                        ip={r.ip}
                        reason={`Manual block from honeypot: ${trap.name}`}
                        ttlHours={24}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-sentinel-border bg-sentinel-panel p-4">
      <div className="text-[10px] uppercase tracking-wide text-sentinel-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
