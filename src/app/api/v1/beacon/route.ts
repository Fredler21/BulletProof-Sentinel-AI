import { NextResponse, type NextRequest } from "next/server";
import { recordSecurityEvent } from "@/lib/server/events";
import { bumpProjectHits, findProjectByApiKey } from "@/lib/server/projects";
import { isIpBlocked } from "@/lib/server/blocklist";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";
import type { BeaconPayload, ThreatSeverity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sentinel-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

function readApiKey(req: NextRequest): string | null {
  const header = req.headers.get("x-sentinel-key");
  if (header) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

function pickSeverity(payload: BeaconPayload): ThreatSeverity {
  // Credential captures are high; everything else defaults to medium so it
  // still surfaces in the live console without spamming alerts.
  if (payload.username || (payload.passwordLength ?? 0) > 0) return "high";
  return "medium";
}

function sanitizeMetadata(
  m: BeaconPayload["metadata"],
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!m) return out;
  let count = 0;
  for (const [k, v] of Object.entries(m)) {
    if (count++ >= 25) break;
    const key = String(k).slice(0, 60);
    if (
      v === null ||
      typeof v === "boolean" ||
      typeof v === "number"
    ) {
      out[key] = v;
    } else if (typeof v === "string") {
      out[key] = v.slice(0, 500);
    }
  }
  return out;
}

export async function OPTIONS(): Promise<Response> {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = readApiKey(req);
  if (!apiKey) {
    return withCors(
      NextResponse.json(
        { ok: false, error: "missing_api_key" },
        { status: 401 },
      ),
    );
  }

  const project = await findProjectByApiKey(apiKey);
  if (!project) {
    return withCors(
      NextResponse.json(
        { ok: false, error: "invalid_api_key" },
        { status: 401 },
      ),
    );
  }

  let body: BeaconPayload;
  try {
    body = (await req.json()) as BeaconPayload;
  } catch {
    return withCors(
      NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      ),
    );
  }

  const path = String(body.path ?? "").slice(0, 300);
  if (!path) {
    return withCors(
      NextResponse.json(
        { ok: false, error: "missing_path" },
        { status: 400 },
      ),
    );
  }

  const ip = (body.ip ?? getRequestIp(req))?.toString().slice(0, 64) ?? null;
  if (await isIpBlocked(ip)) {
    return withCors(
      NextResponse.json(
        { ok: false, error: "ip_blocked" },
        { status: 403 },
      ),
    );
  }
  const userAgent =
    (body.userAgent ?? getRequestUserAgent(req))?.toString().slice(0, 400) ??
    null;
  const severity = pickSeverity(body);
  const username = body.username ? String(body.username).slice(0, 200) : "";
  const passwordLength = Math.max(
    0,
    Math.min(1024, Number(body.passwordLength ?? 0) || 0),
  );

  const baseMessage =
    body.message?.toString().slice(0, 300) ??
    (username
      ? `Embedded honeypot credential attempt on ${path}: ${username || "(empty)"} / ${passwordLength ? "***" : "(empty)"}`
      : `Embedded honeypot triggered: ${path}`);

  const metadata = {
    ...sanitizeMetadata(body.metadata),
    projectId: project.id,
    projectName: project.name,
    projectDomain: project.domain,
    embedded: true,
    method: body.method ? String(body.method).slice(0, 10) : "POST",
    ...(username ? { username } : {}),
    ...(passwordLength ? { passwordLength } : {}),
  };

  const event = await recordSecurityEvent({
    type: username || passwordLength ? "honeypot.credentials" : "honeypot.trigger",
    severity,
    message: baseMessage,
    ip,
    userAgent,
    route: path,
    ownerUid: project.ownerUid,
    metadata,
  });

  await bumpProjectHits(project.id);

  return withCors(
    NextResponse.json({ ok: true, eventId: event.id, severity }, { status: 201 }),
  );
}
