import { adminDb } from "@/lib/firebase/admin";
import { cached, invalidate } from "@/lib/server/cache";
import { shouldDoAuxWrite } from "@/lib/server/quotaGuard";
import type { BlockedIp, BlockSource } from "@/lib/types";

const COL = "blocked_ips";

export function sanitizeIpId(ip: string): string {
  return ip.replace(/[^a-zA-Z0-9]/g, "_");
}

export interface BlockIpInput {
  ip: string;
  reason: string;
  source: BlockSource;
  createdByUid?: string | null;
  ttlHours?: number | null; // null/undefined = permanent
}

export async function blockIp(input: BlockIpInput): Promise<BlockedIp> {
  const now = Date.now();
  const expiresAt =
    input.ttlHours == null ? null : now + input.ttlHours * 3_600_000;
  const record: BlockedIp = {
    ip: input.ip,
    reason: input.reason,
    source: input.source,
    createdByUid: input.createdByUid ?? null,
    createdAt: now,
    expiresAt,
    hits: 0,
    lastAttemptAt: null,
  };
  await adminDb.collection(COL).doc(sanitizeIpId(input.ip)).set(record);
  invalidate("blocklist:all");
  return record;
}

export async function unblockIp(ip: string): Promise<void> {
  await adminDb.collection(COL).doc(sanitizeIpId(ip)).delete();
  invalidate("blocklist:all");
}

export async function listBlockedIps(): Promise<BlockedIp[]> {
  return cached("blocklist:all", 30_000, async () => {
    const snap = await adminDb.collection(COL).get();
    const now = Date.now();
    return snap.docs
      .map((d) => d.data() as BlockedIp)
      .filter((b) => b.expiresAt == null || b.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  });
}

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    const snap = await adminDb.collection(COL).doc(sanitizeIpId(ip)).get();
    const data = snap.data() as BlockedIp | undefined;
    if (!data) return false;
    if (data.expiresAt != null && data.expiresAt <= Date.now()) {
      return false;
    }
    // Throttled fire-and-forget hit counter — at most once per IP per 60s
    // to avoid one write per request from the same scanner.
    if (shouldDoAuxWrite(`blocklist:${ip}`, 60_000)) {
      void snap.ref
        .update({
          hits: (data.hits ?? 0) + 1,
          lastAttemptAt: Date.now(),
        })
        .catch(() => {
          /* ignore */
        });
    }
    return true;
  } catch {
    return false;
  }
}

export async function getBlockedIp(ip: string): Promise<BlockedIp | null> {
  const snap = await adminDb.collection(COL).doc(sanitizeIpId(ip)).get();
  return (snap.data() as BlockedIp | undefined) ?? null;
}
