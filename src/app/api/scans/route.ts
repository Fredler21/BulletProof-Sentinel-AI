import { NextRequest, NextResponse } from "next/server";
import { getAsset, updateAssetAfterScan } from "@/lib/server/assets";
import { listRecentScans, runScan } from "@/lib/server/scanner";
import { requireSessionUser } from "@/lib/server/session";
import { recordSecurityEvent } from "@/lib/server/events";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const scans = await listRecentScans(user.uid, 50);
  return NextResponse.json({ scans });
}

export async function POST(req: NextRequest): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await req.json()) as { assetId?: string };
  if (!body.assetId) {
    return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  }
  const asset = await getAsset(body.assetId, user.uid);
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }
  const result = await runScan(asset, user.uid);
  await updateAssetAfterScan(asset.id, {
    lastScanAt: result.createdAt,
    lastScore: result.score,
    lastSeverity: result.severity,
  });
  if (result.severity === "high" || result.severity === "critical") {
    await recordSecurityEvent({
      type: "scan.suspicious",
      severity: result.severity,
      message: `Scan flagged ${asset.hostname}: ${result.findings.length} findings (score ${result.score}).`,
      route: asset.url,
      ownerUid: user.uid,
      metadata: { assetId: asset.id, scanId: result.id, score: result.score },
    });
  }
  return NextResponse.json({ scan: result });
}
