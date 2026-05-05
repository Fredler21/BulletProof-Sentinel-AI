import { adminDb } from "@/lib/firebase/admin";
import type {
  IncidentReport,
  SecurityEvent,
  ThreatExplanation,
} from "@/lib/types";

const EXPLANATIONS = "ai_explanations";
const REPORTS = "ai_reports";
const EVENTS = "security_events";

export async function getCachedExplanation(
  eventId: string,
): Promise<ThreatExplanation | null> {
  const snap = await adminDb.collection(EXPLANATIONS).doc(eventId).get();
  return (snap.data() as ThreatExplanation | undefined) ?? null;
}

export async function saveExplanation(
  explanation: ThreatExplanation,
): Promise<void> {
  await adminDb
    .collection(EXPLANATIONS)
    .doc(explanation.eventId)
    .set(explanation);
}

export async function saveReport(report: IncidentReport): Promise<void> {
  await adminDb.collection(REPORTS).doc(report.id).set(report);
}

export async function listReports(
  ownerUid: string,
  limit = 25,
): Promise<IncidentReport[]> {
  const snap = await adminDb
    .collection(REPORTS)
    .where("ownerUid", "==", ownerUid)
    .get();
  return snap.docs
    .map((d) => d.data() as IncidentReport)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getReport(
  id: string,
  ownerUid: string,
): Promise<IncidentReport | null> {
  const snap = await adminDb.collection(REPORTS).doc(id).get();
  const data = snap.data() as IncidentReport | undefined;
  if (!data || data.ownerUid !== ownerUid) return null;
  return data;
}

export function newReportId(): string {
  return adminDb.collection(REPORTS).doc().id;
}

export async function getEventById(id: string): Promise<SecurityEvent | null> {
  const snap = await adminDb.collection(EVENTS).doc(id).get();
  return (snap.data() as SecurityEvent | undefined) ?? null;
}
