import { listRecentEvents } from "@/lib/server/events";
import type {
  SecurityEvent,
  SecurityEventType,
  ThreatIncident,
  ThreatSeverity,
} from "@/lib/types";

const SEV_RANK: Record<ThreatSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function maxSeverity(a: ThreatSeverity, b: ThreatSeverity): ThreatSeverity {
  return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

const WINDOW_MS = 30 * 60_000; // 30 minutes — gap that closes an incident

interface Bucket {
  key: string;
  ip: string | null;
  events: SecurityEvent[];
}

/**
 * Group recent events into incidents by IP using a 30-minute rolling window.
 * Events with no IP are bucketed by `(type|route)` so we still surface clusters.
 */
export async function correlateRecentIncidents(
  limitEvents = 500,
  topN = 50,
): Promise<ThreatIncident[]> {
  const events = await listRecentEvents(limitEvents);
  // events arrive newest-first; correlate ascending by time
  events.sort((a, b) => a.createdAt - b.createdAt);

  const open = new Map<string, Bucket>();
  const closed: Bucket[] = [];

  for (const ev of events) {
    const key = ev.ip ?? `noip:${ev.type}:${ev.route ?? ""}`;
    const existing = open.get(key);
    if (existing) {
      const last = existing.events[existing.events.length - 1];
      if (ev.createdAt - last.createdAt > WINDOW_MS) {
        closed.push(existing);
        open.set(key, { key, ip: ev.ip, events: [ev] });
      } else {
        existing.events.push(ev);
      }
    } else {
      open.set(key, { key, ip: ev.ip, events: [ev] });
    }
  }
  for (const b of open.values()) closed.push(b);

  const incidents: ThreatIncident[] = closed
    .filter((b) => b.events.length >= 2)
    .map((b) => bucketToIncident(b));

  incidents.sort(
    (a, b) =>
      SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.lastSeenAt - a.lastSeenAt,
  );
  return incidents.slice(0, topN);
}

function bucketToIncident(b: Bucket): ThreatIncident {
  const types = new Set<SecurityEventType>();
  const routes = new Set<string>();
  let severity: ThreatSeverity = "low";
  for (const e of b.events) {
    types.add(e.type);
    if (e.route) routes.add(e.route);
    severity = maxSeverity(severity, e.severity);
  }
  const first = b.events[0];
  const last = b.events[b.events.length - 1];
  // Promote severity if the bucket itself is large/aggressive
  if (b.events.length >= 10 && SEV_RANK[severity] < SEV_RANK["high"]) {
    severity = "high";
  }
  if (b.events.length >= 25 && severity !== "critical") {
    severity = "critical";
  }
  const id = `${b.key}:${first.createdAt}`;
  const title = b.ip
    ? `${b.events.length} events from ${b.ip}`
    : `${b.events.length} ${first.type} events`;
  return {
    id,
    title,
    ip: b.ip,
    severity,
    eventCount: b.events.length,
    eventTypes: Array.from(types),
    firstSeenAt: first.createdAt,
    lastSeenAt: last.createdAt,
    routes: Array.from(routes).slice(0, 10),
    eventIds: b.events.map((e) => e.id),
    status: "active",
  };
}
