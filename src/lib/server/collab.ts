import { adminDb } from "@/lib/firebase/admin";
import type { AlertItem, AlertNote, AlertStatus } from "@/lib/types";

const ALERTS = "alerts";
const NOTES = "alert_notes";

export async function setAlertStatus(
  id: string,
  status: AlertStatus,
): Promise<void> {
  await adminDb.collection(ALERTS).doc(id).update({ status });
}

export async function setAlertAssignee(
  id: string,
  assignee: { uid: string; name: string | null } | null,
): Promise<void> {
  await adminDb.collection(ALERTS).doc(id).update({
    assigneeUid: assignee?.uid ?? null,
    assigneeName: assignee?.name ?? null,
  });
}

export async function getAlert(id: string): Promise<AlertItem | null> {
  const snap = await adminDb.collection(ALERTS).doc(id).get();
  return (snap.data() as AlertItem | undefined) ?? null;
}

export interface AddNoteInput {
  alertId: string;
  authorUid: string;
  authorName: string | null;
  body: string;
}

export async function addNote(input: AddNoteInput): Promise<AlertNote> {
  const ref = adminDb.collection(NOTES).doc();
  const note: AlertNote = {
    id: ref.id,
    alertId: input.alertId,
    authorUid: input.authorUid,
    authorName: input.authorName,
    body: input.body,
    createdAt: Date.now(),
  };
  await ref.set(note);
  // bump notesCount on the alert (best-effort)
  try {
    const alertRef = adminDb.collection(ALERTS).doc(input.alertId);
    const alertSnap = await alertRef.get();
    const current = (alertSnap.data() as AlertItem | undefined)?.notesCount ?? 0;
    await alertRef.update({ notesCount: current + 1 });
  } catch {
    /* ignore */
  }
  return note;
}

export async function listNotes(alertId: string): Promise<AlertNote[]> {
  const snap = await adminDb
    .collection(NOTES)
    .where("alertId", "==", alertId)
    .get();
  return snap.docs
    .map((d) => d.data() as AlertNote)
    .sort((a, b) => a.createdAt - b.createdAt);
}
