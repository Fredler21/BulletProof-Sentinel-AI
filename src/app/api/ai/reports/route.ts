import { NextRequest, NextResponse } from "next/server";
import {
  buildReport,
  generateReportBody,
  type ReportInput,
} from "@/lib/server/ai";
import { listReports, newReportId, saveReport } from "@/lib/server/aiStore";
import { listRecentEvents } from "@/lib/server/events";
import { listRecentScans } from "@/lib/server/scanner";
import { requireSessionUser } from "@/lib/server/session";
import type { IncidentReportScope } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const reports = await listReports(user.uid, 50);
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    scope?: IncidentReportScope;
    hours?: number;
  };
  const scope: IncidentReportScope =
    body.scope === "technical" ? "technical" : "executive";
  const hours = Math.min(Math.max(body.hours ?? 24, 1), 24 * 30);
  const rangeTo = Date.now();
  const rangeFrom = rangeTo - hours * 3_600_000;

  const allEvents = await listRecentEvents(500);
  const events = allEvents.filter(
    (e) => e.createdAt >= rangeFrom && e.createdAt <= rangeTo,
  );
  const allScans = await listRecentScans(user.uid, 200);
  const scans = allScans.filter(
    (s) => s.createdAt >= rangeFrom && s.createdAt <= rangeTo,
  );

  const input: ReportInput = { scope, rangeFrom, rangeTo, events, scans };
  const { body: md, model } = await generateReportBody(input);
  const report = buildReport(input, md, model, user.uid, newReportId());
  await saveReport(report);
  return NextResponse.json({ report });
}
