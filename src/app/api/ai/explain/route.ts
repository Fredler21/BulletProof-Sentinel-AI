import { NextRequest, NextResponse } from "next/server";
import { explainEvent } from "@/lib/server/ai";
import {
  getCachedExplanation,
  getEventById,
  saveExplanation,
} from "@/lib/server/aiStore";
import { requireSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    eventId?: string;
    refresh?: boolean;
  };
  if (!body.eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }
  if (!body.refresh) {
    const cached = await getCachedExplanation(body.eventId);
    if (cached) return NextResponse.json({ explanation: cached, cached: true });
  }
  const event = await getEventById(body.eventId);
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }
  const explanation = await explainEvent(event);
  await saveExplanation(explanation);
  return NextResponse.json({ explanation, cached: false });
}
