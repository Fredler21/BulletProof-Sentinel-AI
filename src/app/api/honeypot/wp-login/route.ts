import { NextResponse, type NextRequest } from "next/server";
import { triggerTrap } from "@/lib/server/honeypots";
import { recordSecurityEvent } from "@/lib/server/events";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest, path: string): Promise<Response> {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);
  let username = "";
  let password = "";
  try {
    const form = await req.formData();
    username = String(form.get("log") ?? form.get("username") ?? "").slice(0, 200);
    password = String(form.get("pwd") ?? form.get("password") ?? "").slice(0, 200);
  } catch {
    /* ignore body parse errors */
  }

  await triggerTrap(path, { ip, userAgent, method: "POST" });
  // Record the credential-attempt with metadata so it shows up clearly in the
  // live console as a high-value event.
  await recordSecurityEvent({
    type: "honeypot.credentials",
    severity: "high",
    message: `Credential attempt on ${path}: ${username || "(empty)"} / ${
      password ? "***" : "(empty)"
    }`,
    ip,
    userAgent,
    route: path,
    metadata: { username, passwordLength: password.length },
  });

  // Redirect back to the same fake login showing an "incorrect credentials"
  // banner, mimicking real WordPress / admin behaviour to keep attackers
  // engaged and trip the brute-force detector.
  const url = new URL(path + "?err=1", req.url);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest): Promise<Response> {
  return handle(req, "/honeypot/wp-login");
}
