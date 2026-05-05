import { adminDb } from "@/lib/firebase/admin";
import { blockIp, getBlockedIp } from "@/lib/server/blocklist";
import type { SecurityEvent } from "@/lib/types";

const ACTIVITY = "ip_activity";
const HONEYPOT_THRESHOLD = 3; // 3 hits in 1h
const HONEYPOT_WINDOW_MS = 60 * 60 * 1000;
const HONEYPOT_BLOCK_HOURS = 24;

const AUTH_FAIL_THRESHOLD = 8; // 8 failures in 15 minutes
const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000;
const AUTH_FAIL_BLOCK_HOURS = 6;

interface IpActivity {
  ip: string;
  honeypotCount: number;
  honeypotWindowStart: number;
  authFailCount: number;
  authFailWindowStart: number;
  lastUpdated: number;
}

function sanitizeIpId(ip: string): string {
  return ip.replace(/[^a-zA-Z0-9]/g, "_");
}

async function loadActivity(ip: string): Promise<IpActivity> {
  const ref = adminDb.collection(ACTIVITY).doc(sanitizeIpId(ip));
  const snap = await ref.get();
  const now = Date.now();
  const data = snap.data() as IpActivity | undefined;
  return (
    data ?? {
      ip,
      honeypotCount: 0,
      honeypotWindowStart: now,
      authFailCount: 0,
      authFailWindowStart: now,
      lastUpdated: now,
    }
  );
}

async function saveActivity(activity: IpActivity): Promise<void> {
  await adminDb
    .collection(ACTIVITY)
    .doc(sanitizeIpId(activity.ip))
    .set({ ...activity, lastUpdated: Date.now() });
}

export async function applyAutoRules(event: SecurityEvent): Promise<void> {
  if (!event.ip) return;
  // Already blocked? skip.
  const existing = await getBlockedIp(event.ip);
  if (existing && (existing.expiresAt == null || existing.expiresAt > Date.now())) {
    return;
  }

  const activity = await loadActivity(event.ip);
  const now = Date.now();
  let mutated = false;

  if (event.type === "honeypot.trigger") {
    if (now - activity.honeypotWindowStart > HONEYPOT_WINDOW_MS) {
      activity.honeypotWindowStart = now;
      activity.honeypotCount = 0;
    }
    activity.honeypotCount += 1;
    mutated = true;
    if (activity.honeypotCount >= HONEYPOT_THRESHOLD) {
      await blockIp({
        ip: event.ip,
        reason: `Auto-block: ${activity.honeypotCount} honeypot triggers in ${HONEYPOT_WINDOW_MS / 60000}m.`,
        source: "auto.honeypot.flood",
        createdByUid: null,
        ttlHours: HONEYPOT_BLOCK_HOURS,
      });
      activity.honeypotCount = 0;
      activity.honeypotWindowStart = now;
    }
  }

  if (event.type === "auth.login.failure") {
    if (now - activity.authFailWindowStart > AUTH_FAIL_WINDOW_MS) {
      activity.authFailWindowStart = now;
      activity.authFailCount = 0;
    }
    activity.authFailCount += 1;
    mutated = true;
    if (activity.authFailCount >= AUTH_FAIL_THRESHOLD) {
      await blockIp({
        ip: event.ip,
        reason: `Auto-block: ${activity.authFailCount} failed logins in ${AUTH_FAIL_WINDOW_MS / 60000}m.`,
        source: "auto.auth.bruteforce",
        createdByUid: null,
        ttlHours: AUTH_FAIL_BLOCK_HOURS,
      });
      activity.authFailCount = 0;
      activity.authFailWindowStart = now;
    }
  }

  if (mutated) await saveActivity(activity);
}
