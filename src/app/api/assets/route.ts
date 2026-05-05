import { NextRequest, NextResponse } from "next/server";
import { createAsset, listAssets } from "@/lib/server/assets";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await requireSessionUser();
    const assets = await listAssets(user.uid);
    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let body: { name?: string; url?: string };
  try {
    body = (await req.json()) as { name?: string; url?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }
  try {
    const asset = await createAsset({
      ownerUid: user.uid,
      name: body.name ?? "",
      url: body.url,
    });
    return NextResponse.json({ asset });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create asset";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
