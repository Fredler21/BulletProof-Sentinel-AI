/**
 * Quota guard — protects Firestore free-tier writes from being exhausted by
 * scrapers / scanners hammering the honeypot endpoints.
 *
 * Strategies (all in-memory, per serverless instance):
 *   1. Per-IP rate limit (sliding 60s window).
 *   2. Per project+ip+path dedupe with 10-minute TTL.
 *   3. Detect Firestore RESOURCE_EXHAUSTED errors so callers can degrade
 *      gracefully instead of returning a 500 to the attacker (which would
 *      tip them off that the trap exists).
 *
 * Notes:
 *   - These caches are per-instance; on Vercel each cold start gets its own
 *     map. That's fine: even a fleet of 50 warm instances bounds writes to
 *     50 × limits, which is still orders of magnitude below free-tier daily
 *     quota during a real attack.
 *   - Maps are size-capped via a simple FIFO eviction so we don't leak memory.
 */

interface DedupeEntry {
  expiresAt: number;
}

interface RateEntry {
  windowStart: number;
  count: number;
}

const DEDUPE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEDUPE_MAX = 5_000;

const RATE_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_MAX_PER_WINDOW = 6; // 6 logged events per IP per minute
const RATE_MAX_ENTRIES = 5_000;

const dedupeMap = new Map<string, DedupeEntry>();
const rateMap = new Map<string, RateEntry>();

function evictIfNeeded<T>(map: Map<string, T>, max: number): void {
  if (map.size <= max) return;
  // Drop oldest ~10% to amortize.
  const toDrop = Math.ceil(map.size - max + max * 0.1);
  let i = 0;
  for (const k of map.keys()) {
    map.delete(k);
    if (++i >= toDrop) break;
  }
}

export interface GuardInput {
  projectId: string;
  ip: string | null;
  path: string;
}

export interface GuardDecision {
  allow: boolean;
  reason?: "rate_limited" | "duplicate";
}

/**
 * Decide whether this honeypot hit should be persisted to Firestore.
 * Returns `allow=false` for duplicates within 10 min OR when the IP exceeds
 * the per-minute rate cap.
 */
export function shouldRecordHoneypotHit(input: GuardInput): GuardDecision {
  const now = Date.now();
  const ip = (input.ip ?? "unknown").trim() || "unknown";

  // 1. Rate limit per IP (independent of project so a single attacker can't
  //    saturate writes by rotating paths/projects).
  const rateKey = ip;
  const rate = rateMap.get(rateKey);
  if (!rate || now - rate.windowStart > RATE_WINDOW_MS) {
    rateMap.set(rateKey, { windowStart: now, count: 1 });
    evictIfNeeded(rateMap, RATE_MAX_ENTRIES);
  } else {
    if (rate.count >= RATE_MAX_PER_WINDOW) {
      return { allow: false, reason: "rate_limited" };
    }
    rate.count += 1;
  }

  // 2. Dedupe within 10 minutes.
  const dedupeKey = `${input.projectId}|${ip}|${input.path}`;
  const existing = dedupeMap.get(dedupeKey);
  if (existing && existing.expiresAt > now) {
    return { allow: false, reason: "duplicate" };
  }
  dedupeMap.set(dedupeKey, { expiresAt: now + DEDUPE_TTL_MS });
  evictIfNeeded(dedupeMap, DEDUPE_MAX);

  return { allow: true };
}

/**
 * Independent throttle for ancillary writes (e.g. blocklist hit-counter
 * updates) so we don't write once per request from the same IP.
 */
const auxThrottle = new Map<string, number>();
const AUX_THROTTLE_MAX = 5_000;

export function shouldDoAuxWrite(key: string, ttlMs = 60_000): boolean {
  const now = Date.now();
  const next = auxThrottle.get(key);
  if (next && next > now) return false;
  auxThrottle.set(key, now + ttlMs);
  evictIfNeeded(auxThrottle, AUX_THROTTLE_MAX);
  return true;
}

/**
 * Returns true when the given error looks like a Firestore quota / rate-limit
 * failure (RESOURCE_EXHAUSTED, code 8, or message contains "Quota exceeded").
 */
export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number | string; message?: string; status?: string };
  if (e.code === 8 || e.code === "8") return true;
  if (typeof e.code === "string" && e.code.toUpperCase() === "RESOURCE_EXHAUSTED")
    return true;
  if (
    typeof e.status === "string" &&
    e.status.toUpperCase() === "RESOURCE_EXHAUSTED"
  )
    return true;
  if (typeof e.message === "string") {
    const m = e.message.toLowerCase();
    if (
      m.includes("quota exceeded") ||
      m.includes("resource_exhausted") ||
      m.includes("rate limit") ||
      m.includes("too many writes")
    )
      return true;
  }
  return false;
}

let quotaTrippedAt = 0;
const QUOTA_BACKOFF_MS = 5 * 60 * 1000; // skip writes for 5 minutes once tripped

export function markQuotaExceeded(): void {
  quotaTrippedAt = Date.now();
}

export function isInQuotaBackoff(): boolean {
  return Date.now() - quotaTrippedAt < QUOTA_BACKOFF_MS;
}
