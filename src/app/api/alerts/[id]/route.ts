import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert } from "@/lib/server/events";
import {
  getAlert,
  setAlertAssignee,
  setAlertStatus,
} from "@/lib/server/collab";
import { requireSessionUser } from "@/lib/server/session";
import type { AlertStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const alert = await getAlert(id);
  if (!alert) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ alert });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: AlertStatus;
    assignToMe?: boolean;
    unassign?: boolean;
    acknowledge?: boolean;
  };

  if (body.status) {
    await setAlertStatus(id, body.status);
  }
  if (body.assignToMe) {
    await setAlertAssignee(id, {
      uid: user.uid,
      name: user.displayName ?? user.email ?? null,
    });
  }
  if (body.unassign) {
    await setAlertAssignee(id, null);
  }
  if (body.acknowledge) {
    await acknowledgeAlert(id);
  }
  return NextResponse.json({ ok: true });
}
