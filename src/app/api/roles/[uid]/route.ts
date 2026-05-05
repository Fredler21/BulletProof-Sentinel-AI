import { NextResponse } from "next/server";
import { requireRole, setRole } from "@/lib/server/roles";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: UserRole[] = [
  "viewer",
  "it-admin",
  "security-analyst",
  "super-admin",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ uid: string }> },
): Promise<NextResponse> {
  let me;
  try {
    me = await requireRole("super-admin");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { uid } = await ctx.params;
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
  if (uid === me.uid) {
    return NextResponse.json(
      { error: "cannot change your own role" },
      { status: 400 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { role?: string };
  if (!body.role || !VALID.includes(body.role as UserRole)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  await setRole(uid, body.role as UserRole, me.uid, null);
  return NextResponse.json({ ok: true });
}
