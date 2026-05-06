import { NextRequest, NextResponse } from "next/server";
import { triggerTrap } from "@/lib/server/honeypots";
import { isIpBlocked } from "@/lib/server/blocklist";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";
import { pickTaunt } from "@/lib/server/honeypotTaunts";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest): Promise<Response> {
  const ip = getRequestIp(req);
  if (await isIpBlocked(ip)) {
    return NextResponse.json(
      {
        error: "forbidden",
        code: "IP_BLOCKED",
        _notice: "You're blocked. Sentinel AI says hi. 👋",
      },
      { status: 403 },
    );
  }
  await triggerTrap("/api/honeypot/v1/users", {
    ip,
    userAgent: getRequestUserAgent(req),
    method: req.method,
  });
  return NextResponse.json(
    {
      error: "internal_error",
      code: "DB_TIMEOUT",
      _notice: pickTaunt(ip),
      _hint: "This is a honeypot. The DB you're looking for is in another castle. 🏰",
      _users: [
        { id: 1, name: "You", role: "suspect", note: "say hi to the SOC team 👋" },
      ],
      _disclaimer:
        "No real users were harmed in the making of this 500. You, however, are now a log line.",
    },
    {
      status: 500,
      headers: {
        "X-Sentinel-Trap": "1",
        "X-Powered-By": "Vibes and a Raspberry Pi",
        "X-Honeypot-Snack": "honey",
      },
    },
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
