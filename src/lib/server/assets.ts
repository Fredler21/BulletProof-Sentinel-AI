import { adminDb } from "@/lib/firebase/admin";
import type { Asset, ThreatSeverity } from "@/lib/types";

const COL = "assets";

export interface CreateAssetInput {
  ownerUid: string;
  name: string;
  url: string;
}

function normalizeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withScheme);
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const url = normalizeUrl(input.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL must be http or https");
  }
  const doc = adminDb.collection(COL).doc();
  const asset: Asset = {
    id: doc.id,
    ownerUid: input.ownerUid,
    name: input.name.trim() || url.hostname,
    url: url.toString(),
    hostname: url.hostname,
    createdAt: Date.now(),
    lastScanAt: null,
    lastScore: null,
    lastSeverity: null,
  };
  await doc.set(asset);
  return asset;
}

export async function listAssets(ownerUid: string): Promise<Asset[]> {
  const snap = await adminDb
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .get();
  return snap.docs
    .map((d) => d.data() as Asset)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAsset(
  id: string,
  ownerUid: string,
): Promise<Asset | null> {
  const doc = await adminDb.collection(COL).doc(id).get();
  const data = doc.data() as Asset | undefined;
  if (!data || data.ownerUid !== ownerUid) return null;
  return data;
}

export async function deleteAsset(
  id: string,
  ownerUid: string,
): Promise<void> {
  const asset = await getAsset(id, ownerUid);
  if (!asset) return;
  await adminDb.collection(COL).doc(id).delete();
}

export async function updateAssetAfterScan(
  id: string,
  patch: { lastScanAt: number; lastScore: number; lastSeverity: ThreatSeverity },
): Promise<void> {
  await adminDb.collection(COL).doc(id).update(patch);
}
