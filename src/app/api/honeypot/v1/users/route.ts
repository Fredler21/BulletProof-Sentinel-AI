import { NextRequest, NextResponse } from "next/server";
import { triggerTrap } from "@/lib/server/honeypots";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";

export const dynamic = "force-dynamic";


async function handle(req: NextRequest): Promise<Response> {
  await triggerTrap("/api/honeypot/v1/users", {
    ip: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
    method: req.method,
  });
  return NextResponse.json(
    { error: "internal_error", code: "DB_TIMEOUT" },
    { status: 500 },
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
