import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import type { SessionUser } from "@/lib/types";

const FIVE_DAYS_MS = 60 * 60 * 24 * 5 * 1000;

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "__sentinel_session";

export async function createSessionCookie(idToken: string): Promise<{
  cookie: string;
  expiresIn: number;
}> {
  const expiresIn = FIVE_DAYS_MS;
  const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  return { cookie, expiresIn };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
