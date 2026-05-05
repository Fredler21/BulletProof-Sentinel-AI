import { NextRequest, NextResponse } from "next/server";
import { addNote, listNotes } from "@/lib/server/collab";
import { requireSessionUser } from "@/lib/server/session";

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
  const notes = await listNotes(id);
  return NextResponse.json({ notes });
}

export async function POST(
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
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  const text = body.body?.trim();
  if (!text) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }
  const note = await addNote({
    alertId: id,
    authorUid: user.uid,
    authorName: user.displayName ?? user.email ?? null,
    body: text.slice(0, 4000),
  });
  return NextResponse.json({ note });
}
