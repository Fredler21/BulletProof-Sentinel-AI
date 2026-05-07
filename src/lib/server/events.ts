import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { applyAutoRules } from "@/lib/server/autoRules";
import { cached } from "@/lib/server/cache";
import {
  isInQuotaBackoff,
  isQuotaError,
  markQuotaExceeded,
} from "@/lib/server/quotaGuard";
import type {
  AlertItem,
  SecurityEvent,
  SecurityEventType,
  ThreatSeverity,
} from "@/lib/types";

const EVENTS = "security_events";
const ALERTS = "alerts";

export interface RecordEventInput {
  type: SecurityEventType;
  severity: ThreatSeverity;
  message: string;
  ip?: string | null;
  userAgent?: string | null;
  route?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  ownerUid?: string | null;
}

export async function recordSecurityEvent(
  input: RecordEventInput,
): Promise<SecurityEvent> {
  const now = Date.now();
  const doc = adminDb.collection(EVENTS).doc();
  // 30 day retention via Firestore TTL on the `expiresAt` field.
  const expiresAt = Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);
  const event: SecurityEvent = {
    id: doc.id,
    type: input.type,
    severity: input.severity,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    route: input.route ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
    createdAt: now,
    ownerUid: input.ownerUid ?? null,
  };

  // If we recently saw a quota-exceeded error, skip writes for the backoff
  // window so we don't keep hammering Firestore (which both wastes the rate
  // limit and slows the trap response).
  if (isInQuotaBackoff()) {
    return event;
  }

  try {
    // Persist with the TTL helper field alongside the typed payload.
    await doc.set({ ...event, expiresAt });
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      // eslint-disable-next-line no-console
      console.warn(
        "[quota] Firestore write skipped — RESOURCE_EXHAUSTED. Backing off.",
      );
      return event;
    }
    // eslint-disable-next-line no-console
    console.error("[recordSecurityEvent] write failed", err);
    return event;
  }

  if (input.severity === "high" || input.severity === "critical") {
    try {
      await createAlertFromEvent(event);
    } catch (err) {
      if (isQuotaError(err)) markQuotaExceeded();
      // eslint-disable-next-line no-console
      else console.error("[recordSecurityEvent] alert write failed", err);
    }
  }

  // Best-effort: run autonomous response rules (auto-block, etc.)
  try {
    await applyAutoRules(event);
  } catch (err) {
    if (isQuotaError(err)) markQuotaExceeded();
    /* never block event recording */
  }

  return event;
}

export async function listRecentEvents(limit = 50): Promise<SecurityEvent[]> {
  // Cache 20s — dashboard pages re-render frequently and this absorbs reloads.
  return cached(`events:recent:${limit}`, 20_000, async () => {
    const snap = await adminDb
      .collection(EVENTS)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as SecurityEvent);
  });
}

export async function listEventsForRoute(
  route: string,
  limit = 200,
): Promise<SecurityEvent[]> {
  return cached(`events:route:${route}:${limit}`, 30_000, async () => {
    // Avoid composite index requirement: filter by route, sort in memory.
    const snap = await adminDb
      .collection(EVENTS)
      .where("route", "==", route)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => d.data() as SecurityEvent)
      .sort((a, b) => b.createdAt - a.createdAt);
  });
}

export async function listEventsForProject(
  projectId: string,
  limit = 500,
): Promise<SecurityEvent[]> {
  return cached(`events:project:${projectId}:${limit}`, 30_000, async () => {
    const snap = await adminDb
      .collection(EVENTS)
      .where("metadata.projectId", "==", projectId)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => d.data() as SecurityEvent)
      .sort((a, b) => b.createdAt - a.createdAt);
  });
}

async function createAlertFromEvent(event: SecurityEvent): Promise<void> {
  const doc = adminDb.collection(ALERTS).doc();
  const alert: AlertItem = {
    id: doc.id,
    title: event.message,
    severity: event.severity,
    source: event.type,
    createdAt: event.createdAt,
    acknowledged: false,
    eventId: event.id,
    status: "open",
    assigneeUid: null,
    assigneeName: null,
    notesCount: 0,
  };
  await doc.set(alert);
}

export async function listRecentAlerts(limit = 25): Promise<AlertItem[]> {
  return cached(`alerts:recent:${limit}`, 20_000, async () => {
    const snap = await adminDb
      .collection(ALERTS)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as AlertItem);
  });
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await adminDb.collection(ALERTS).doc(id).update({ acknowledged: true });
}
