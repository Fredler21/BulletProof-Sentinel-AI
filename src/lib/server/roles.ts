import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser, requireSessionUser } from "@/lib/server/session";
import type { SessionUser, UserRole, UserRoleDoc } from "@/lib/types";

const COL = "user_roles";

const BOOTSTRAP_EMAILS = (process.env.SENTINEL_SUPER_ADMINS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const RANK: Record<UserRole, number> = {
  viewer: 0,
  "it-admin": 1,
  "security-analyst": 2,
  "super-admin": 3,
};

export async function getUserRole(uid: string): Promise<UserRoleDoc | null> {
  const snap = await adminDb.collection(COL).doc(uid).get();
  return (snap.data() as UserRoleDoc | undefined) ?? null;
}

export async function ensureRoleForUser(
  user: SessionUser,
): Promise<UserRoleDoc> {
  const existing = await getUserRole(user.uid);
  if (existing) return existing;
  const isBootstrap =
    !!user.email && BOOTSTRAP_EMAILS.includes(user.email.toLowerCase());
  // First-ever user becomes super-admin if no roles assigned yet.
  let role: UserRole = "viewer";
  if (isBootstrap) {
    role = "super-admin";
  } else {
    const any = await adminDb.collection(COL).limit(1).get();
    if (any.empty) role = "super-admin";
  }
  const doc: UserRoleDoc = {
    uid: user.uid,
    email: user.email,
    role,
    assignedByUid: null,
    updatedAt: Date.now(),
  };
  await adminDb.collection(COL).doc(user.uid).set(doc);
  return doc;
}

export async function getCurrentRole(): Promise<UserRoleDoc | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return ensureRoleForUser(user);
}

export async function requireRole(min: UserRole): Promise<UserRoleDoc> {
  const user = await requireSessionUser();
  const r = await ensureRoleForUser(user);
  if (RANK[r.role] < RANK[min]) {
    throw new Error("FORBIDDEN");
  }
  return r;
}

export async function listAllRoles(): Promise<UserRoleDoc[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs
    .map((d) => d.data() as UserRoleDoc)
    .sort((a, b) => RANK[b.role] - RANK[a.role]);
}

export async function setRole(
  targetUid: string,
  role: UserRole,
  assignedByUid: string,
  email: string | null,
): Promise<void> {
  const doc: UserRoleDoc = {
    uid: targetUid,
    email,
    role,
    assignedByUid,
    updatedAt: Date.now(),
  };
  await adminDb.collection(COL).doc(targetUid).set(doc, { merge: true });
}

export const ROLE_LABEL: Record<UserRole, string> = {
  "super-admin": "Super Admin",
  "security-analyst": "Security Analyst",
  "it-admin": "IT Administrator",
  viewer: "Viewer",
};
