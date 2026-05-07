import { NextResponse, type NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/server/session";
import { createProject, listProjectsForUser } from "@/lib/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await requireSessionUser();
    const projects = await listProjectsForUser(user.uid);
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { name?: string; domain?: string };
  try {
    body = (await req.json()) as { name?: string; domain?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const domain = (body.domain ?? "").trim() || null;

  const { project, apiKey } = await createProject({
    ownerUid: user.uid,
    name,
    domain,
  });

  // apiKey is returned ONCE here (not stored in plaintext).
  return NextResponse.json({ project, apiKey }, { status: 201 });
}
