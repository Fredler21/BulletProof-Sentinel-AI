import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/server/session";
import { getGeoForIps } from "@/lib/server/geoip";
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
  geo: {
    country: string | null;
    countryCode: string | null;
    city: string | null;
    org: string | null;
  } | null;
}

function approxLatLon(geo: GeoInfo | undefined): { lat: number; lon: number } | null {
  if (!geo) return null;
  // Crude country-centric coordinates so the world map can render dots without
  // needing a full geo coords cache. Falls back to null when unknown.
  const code = geo.countryCode?.toUpperCase();
  const COORDS: Record<string, [number, number]> = {
    US: [38, -97], CA: [56, -106], MX: [23, -102], BR: [-10, -55], AR: [-34, -64],
    GB: [54, -2], IE: [53, -8], FR: [46, 2], DE: [51, 10], ES: [40, -4], IT: [42, 12],
    NL: [52, 5], SE: [60, 18], NO: [62, 10], FI: [64, 26], PL: [52, 19], UA: [49, 32],
    RU: [60, 100], TR: [39, 35], EG: [27, 30], ZA: [-30, 25], NG: [10, 8], KE: [-1, 38],
    IN: [22, 78], CN: [35, 105], JP: [36, 138], KR: [37, 127], SG: [1, 103], MY: [4, 102],
    ID: [-2, 118], TH: [15, 100], VN: [16, 108], PH: [13, 122], AU: [-25, 134], NZ: [-41, 174],
    SA: [24, 45], AE: [24, 54], IL: [31, 35], IR: [32, 53], PK: [30, 70],
  };
  if (code && COORDS[code]) {
    const [lat, lon] = COORDS[code];
    // Add small jitter so multiple events from same country don't pile up
    return {
      lat: lat + (Math.random() - 0.5) * 4,
      lon: lon + (Math.random() - 0.5) * 4,
    };
  }
  return null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 40), 100);

  const snap = await adminDb
    .collection("security_events")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const events = snap.docs.map((d) => d.data() as SecurityEvent);
  const ips = events.map((e) => e.ip).filter((ip): ip is string => !!ip);
  const geoMap = await getGeoForIps(ips);

  const items: (LiveFeedItem & { coords: { lat: number; lon: number } | null })[] =
    events.map((e) => {
      const geo = e.ip ? geoMap.get(e.ip) : undefined;
      return {
        id: e.id,
        type: e.type,
        severity: e.severity,
        ip: e.ip,
        route: e.route,
        message: e.message,
        createdAt: e.createdAt,
        geo: geo
          ? {
              country: geo.country,
              countryCode: geo.countryCode,
              city: geo.city,
              org: geo.org,
            }
          : null,
        coords: approxLatLon(geo),
      };
    });

  return NextResponse.json({ items, serverTime: Date.now() });
}
