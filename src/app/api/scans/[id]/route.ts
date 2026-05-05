import { NextResponse } from "next/server";
import { getScan } from "@/lib/server/scanner";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(
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
  const scan = await getScan(id, user.uid);
  if (!scan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ scan });
}
