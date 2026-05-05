import { adminDb } from "@/lib/firebase/admin";
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
  await doc.set(event);

  if (input.severity === "high" || input.severity === "critical") {
    await createAlertFromEvent(event);
  }

  return event;
}

export async function listRecentEvents(limit = 50): Promise<SecurityEvent[]> {
  const snap = await adminDb
    .collection(EVENTS)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as SecurityEvent);
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
  };
  await doc.set(alert);
}

export async function listRecentAlerts(limit = 25): Promise<AlertItem[]> {
  const snap = await adminDb
    .collection(ALERTS)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as AlertItem);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await adminDb.collection(ALERTS).doc(id).update({ acknowledged: true });
}
