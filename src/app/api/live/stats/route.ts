import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/server/session";
import { listBlockedIps } from "@/lib/server/blocklist";
import { cached } from "@/lib/server/cache";
import type { ScanResult, SecurityEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  // Cache for 30s — clients poll every 5–10s, so this collapses ~6 polls
  // into one Firestore read pass per warm instance.
  const payload = await cached("live:stats", 30_000, async () => {
    const since24h = Date.now() - 24 * 60 * 60_000;
    const since1h = Date.now() - 60 * 60_000;

    const [eventsSnap, hpSnap, blocks] = await Promise.all([
      adminDb
        .collection("security_events")
        .orderBy("createdAt", "desc")
        .limit(150)
        .get(),
      adminDb.collection("honeypots").get(),
      listBlockedIps(),
    ]);

    const events = eventsSnap.docs.map((d) => d.data() as SecurityEvent);
    const last24h = events.filter((e) => e.createdAt >= since24h);
    const last1h = events.filter((e) => e.createdAt >= since1h);
    const ips = new Set<string>();
    for (const e of last24h) if (e.ip) ips.add(e.ip);

    const honeypotEvents = last24h.filter((e) => e.type === "honeypot.trigger");
    const authFailEvents = last24h.filter(
      (e) => e.type === "auth.login.failure",
    );
    const high = last24h.filter(
      (e) => e.severity === "high" || e.severity === "critical",
    ).length;

    // Skipped: scans collection — read on demand from /dashboard/scanner only.
    const vulns = 0;
    const worstScore = 0;

    return {
      activeAttackers: new Set(
        last1h.filter((e) => e.ip).map((e) => e.ip),
      ).size,
      connectionsToday: last24h.length,
      uniqueIps: ips.size,
      highRiskSessions: high,
      vulnsDetected: vulns,
      honeypotEngagements: honeypotEvents.length,
      commandsExecuted: authFailEvents.length + honeypotEvents.length,
      riskScore: worstScore,
      blockedIps: blocks.length,
      honeypotsDeployed: hpSnap.size,
      eventsPerMinute: Math.round(last1h.length / 60),
      serverTime: Date.now(),
    };
  });

  // Always overwrite serverTime so client-side clocks stay live.
  return NextResponse.json({ ...payload, serverTime: Date.now() });
}
