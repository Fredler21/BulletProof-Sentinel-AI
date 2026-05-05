import { NextResponse } from "next/server";
import { deleteAsset } from "@/lib/server/assets";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  await deleteAsset(id, user.uid);
  return NextResponse.json({ ok: true });
}
