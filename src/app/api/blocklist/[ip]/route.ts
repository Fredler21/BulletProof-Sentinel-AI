import { NextResponse } from "next/server";
import { unblockIp } from "@/lib/server/blocklist";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ip: string }> },
): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { ip } = await params;
  await unblockIp(decodeURIComponent(ip));
  return NextResponse.json({ ok: true });
}
