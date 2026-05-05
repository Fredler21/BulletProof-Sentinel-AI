import { NextResponse } from "next/server";
import { listTraps } from "@/lib/server/honeypots";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";


export async function GET(): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const traps = await listTraps();
  return NextResponse.json({ traps });
}
