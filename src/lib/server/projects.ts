import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { HoneypotProject } from "@/lib/types";

const COL = "honeypot_projects";

export interface CreateProjectInput {
  ownerUid: string;
  name: string;
  domain?: string | null;
}

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(24).toString("base64url");
  const key = `bps_live_${raw}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 16);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ project: HoneypotProject; apiKey: string }> {
  const ref = adminDb.collection(COL).doc();
  const { key, hash, prefix } = generateApiKey();
  const project: HoneypotProject = {
    id: ref.id,
    ownerUid: input.ownerUid,
    name: input.name.slice(0, 120),
    domain: (input.domain ?? null)?.slice(0, 200) ?? null,
    apiKeyPrefix: prefix,
    apiKeyHash: hash,
    createdAt: Date.now(),
    hits: 0,
    lastHitAt: null,
  };
  await ref.set(project);
  return { project, apiKey: key };
}

export async function listProjectsForUser(
  ownerUid: string,
): Promise<HoneypotProject[]> {
  const snap = await adminDb
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .get();
  return snap.docs
    .map((d) => d.data() as HoneypotProject)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function findProjectById(
  id: string,
): Promise<HoneypotProject | null> {
  const doc = await adminDb.collection(COL).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as HoneypotProject;
}

export async function findProjectByApiKey(
  key: string,
): Promise<HoneypotProject | null> {
  const hash = hashApiKey(key);
  const snap = await adminDb
    .collection(COL)
    .where("apiKeyHash", "==", hash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as HoneypotProject;
}

export async function bumpProjectHits(id: string): Promise<void> {
  try {
    await adminDb
      .collection(COL)
      .doc(id)
      .update({ hits: FieldValue.increment(1), lastHitAt: Date.now() });
  } catch {
    /* never block */
  }
}

export async function deleteProject(id: string, ownerUid: string): Promise<boolean> {
  const ref = adminDb.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const data = doc.data() as HoneypotProject;
  if (data.ownerUid !== ownerUid) return false;
  await ref.delete();
  return true;
}
