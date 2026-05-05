import { NextRequest } from "next/server";

export function getRequestIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? null;
}

export function getRequestUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent");
}
