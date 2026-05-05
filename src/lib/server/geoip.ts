import { adminDb } from "@/lib/firebase/admin";
import type { GeoInfo } from "@/lib/types";

const COL = "geo_cache";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface IpwhoResponse {
  success?: boolean;
  ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  connection?: { org?: string; asn?: number; isp?: string };
  timezone?: { id?: string };
}

function isPrivateOrLoopback(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

async function fetchGeo(ip: string): Promise<GeoInfo | null> {
  if (isPrivateOrLoopback(ip)) {
    return {
      ip,
      country: "Local",
      countryCode: null,
      region: null,
      city: null,
      org: null,
      asn: null,
      cachedAt: Date.now(),
    };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as IpwhoResponse;
    if (data.success === false) return null;
    return {
      ip,
      country: data.country ?? null,
      countryCode: data.country_code ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      org: data.connection?.org ?? data.connection?.isp ?? null,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
      cachedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getGeoForIp(ip: string): Promise<GeoInfo | null> {
  const docId = ip.replace(/[^a-zA-Z0-9]/g, "_");
  const ref = adminDb.collection(COL).doc(docId);
  const snap = await ref.get();
  const cached = snap.data() as GeoInfo | undefined;
  if (cached && Date.now() - cached.cachedAt < TTL_MS) {
    return cached;
  }
  const fresh = await fetchGeo(ip);
  if (fresh) {
    await ref.set(fresh);
    return fresh;
  }
  return cached ?? null;
}

export async function getGeoForIps(
  ips: ReadonlyArray<string>,
): Promise<Map<string, GeoInfo>> {
  const unique = Array.from(new Set(ips.filter(Boolean)));
  const result = new Map<string, GeoInfo>();
  await Promise.all(
    unique.map(async (ip) => {
      const g = await getGeoForIp(ip);
      if (g) result.set(ip, g);
    }),
  );
  return result;
}
