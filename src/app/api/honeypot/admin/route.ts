import { NextResponse, type NextRequest } from "next/server";
import { triggerTrap } from "@/lib/server/honeypots";
import { recordSecurityEvent } from "@/lib/server/events";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);
  let username = "";
  let password = "";
  try {
    const form = await req.formData();
    username = String(form.get("username") ?? form.get("log") ?? "").slice(0, 200);
    password = String(form.get("password") ?? form.get("pwd") ?? "").slice(0, 200);
  } catch {
    /* ignore */
  }

  await triggerTrap("/honeypot/admin", { ip, userAgent, method: "POST" });
  await recordSecurityEvent({
    type: "honeypot.credentials",
    severity: "high",
    message: `Credential attempt on /honeypot/admin: ${
      username || "(empty)"
    } / ${password ? "***" : "(empty)"}`,
    ip,
    userAgent,
    route: "/honeypot/admin",
    metadata: { username, passwordLength: password.length },
  });

  const url = new URL("/honeypot/admin?err=1", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
