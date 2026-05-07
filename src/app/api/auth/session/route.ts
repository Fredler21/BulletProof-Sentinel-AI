import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
} from "@/lib/server/session";
import { recordSecurityEvent } from "@/lib/server/events";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// Comma-separated list of email addresses allowed to log in or sign up.
// Empty / unset = no allowlist (anyone can sign in).
const ALLOWED_EMAILS = (process.env.SENTINEL_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isEmailAllowed(email: string | null | undefined): boolean {
  if (ALLOWED_EMAILS.length === 0) return true;
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

interface SessionBody {
  idToken: string;
  signup?: boolean;
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: SessionBody;
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.idToken || typeof body.idToken !== "string") {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(body.idToken, true);

    // Email allowlist gate: if SENTINEL_ALLOWED_EMAILS is set, only those
    // addresses may sign in / sign up. Everyone else is rejected and the
    // attempt is logged as a high-severity event.
    if (!isEmailAllowed(decoded.email)) {
      void recordSecurityEvent({
        type: "auth.login.failure",
        severity: "high",
        message: `Login blocked by allowlist: ${decoded.email ?? decoded.uid}`,
        ip: getRequestIp(req),
        userAgent: getRequestUserAgent(req),
        route: "/api/auth/session",
        metadata: { email: decoded.email ?? null, uid: decoded.uid },
      }).catch(() => {});
      return NextResponse.json(
        { error: "email_not_allowed" },
        { status: 403 },
      );
    }

    const { cookie, expiresIn } = await createSessionCookie(body.idToken);

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: cookie,
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    void recordSecurityEvent({
      type: body.signup ? "auth.signup" : "auth.login.success",
      severity: "low",
      message: body.signup
        ? `New account created: ${decoded.email ?? decoded.uid}`
        : `User signed in: ${decoded.email ?? decoded.uid}`,
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      route: "/api/auth/session",
      ownerUid: decoded.uid,
    }).catch(() => {});

    return res;
  } catch {
    void recordSecurityEvent({
      type: "auth.login.failure",
      severity: "medium",
      message: "Invalid Firebase ID token presented to session endpoint",
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      route: "/api/auth/session",
    }).catch(() => {});
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}

export async function DELETE(): Promise<Response> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return res;
}
