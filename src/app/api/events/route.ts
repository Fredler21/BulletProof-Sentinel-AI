import { NextResponse } from "next/server";
import { listRecentEvents } from "@/lib/server/events";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";


export async function GET(): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const events = await listRecentEvents(100);
  return NextResponse.json({ events });
}
