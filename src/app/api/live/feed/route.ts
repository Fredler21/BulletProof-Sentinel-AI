import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/server/session";
import { getGeoForIps } from "@/lib/server/geoip";
import { cached } from "@/lib/server/cache";
import type { GeoInfo, SecurityEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface LiveFeedItem {
  id: string;
  type: SecurityEvent["type"];
  severity: SecurityEvent["severity"];
  ip: string | null;
  route: string | null;
  message: string;
  createdAt: number;
  projectId: string | null;
  projectName: string | null;
  geo: {
    country: string | null;
    countryCode: string | null;
    city: string | null;
    region: string | null;
    org: string | null;
    asn: string | null;
  } | null;
}

// Country-centroid fallback used only when the upstream geo provider returned
// no precise lat/lon (rare). We prefer the real lat/lon from ipwho.is.
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [38, -97], CA: [56, -106], MX: [23, -102], BR: [-10, -55], AR: [-34, -64],
  GB: [54, -2], IE: [53, -8], FR: [46, 2], DE: [51, 10], ES: [40, -4], IT: [42, 12],
  NL: [52, 5], SE: [60, 18], NO: [62, 10], FI: [64, 26], PL: [52, 19], UA: [49, 32],
  RU: [60, 100], TR: [39, 35], EG: [27, 30], ZA: [-30, 25], NG: [10, 8], KE: [-1, 38],
  IN: [22, 78], CN: [35, 105], JP: [36, 138], KR: [37, 127], SG: [1, 103], MY: [4, 102],
  ID: [-2, 118], TH: [15, 100], VN: [16, 108], PH: [13, 122], AU: [-25, 134], NZ: [-41, 174],
  SA: [24, 45], AE: [24, 54], IL: [31, 35], IR: [32, 53], PK: [30, 70],
};

function coordsFor(geo: GeoInfo | undefined): { lat: number; lon: number } | null {
  if (!geo) return null;
  if (typeof geo.lat === "number" && typeof geo.lon === "number") {
    return { lat: geo.lat, lon: geo.lon };
  }
  const code = geo.countryCode?.toUpperCase();
  if (code && COUNTRY_CENTROIDS[code]) {
    const [lat, lon] = COUNTRY_CENTROIDS[code];
    return { lat, lon };
  }
  return null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 40), 80);

  // Cache the feed for 15s — clients poll every 8s now, so each poll mostly
  // hits the cache. Also caps Firestore reads to ~`limit` per cache miss.
  const items = await cached(`live:feed:${limit}`, 15_000, async () => {
    const snap = await adminDb
      .collection("security_events")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const events = snap.docs.map((d) => d.data() as SecurityEvent);
    const ips = events.map((e) => e.ip).filter((ip): ip is string => !!ip);
    const geoMap = await getGeoForIps(ips);

    return events.map((e) => {
      const geo = e.ip ? geoMap.get(e.ip) : undefined;
      const meta = e.metadata ?? {};
      const projectId = typeof meta.projectId === "string" ? meta.projectId : null;
      const projectName = typeof meta.projectName === "string" ? meta.projectName : null;
      return {
        id: e.id,
        type: e.type,
        severity: e.severity,
        ip: e.ip,
        route: e.route,
        message: e.message,
        createdAt: e.createdAt,
        projectId,
        projectName,
        geo: geo
          ? {
              country: geo.country,
              countryCode: geo.countryCode,
              city: geo.city,
              region: geo.region,
              org: geo.org,
              asn: geo.asn,
            }
          : null,
        coords: coordsFor(geo),
      };
    });
  });

  return NextResponse.json({ items, serverTime: Date.now() });
}
