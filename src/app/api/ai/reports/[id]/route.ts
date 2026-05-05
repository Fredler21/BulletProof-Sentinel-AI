import { NextResponse } from "next/server";
import { getReport } from "@/lib/server/aiStore";
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
  const report = await getReport(id, user.uid);
  if (!report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ report });
}
