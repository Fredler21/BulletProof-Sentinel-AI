import { adminDb } from "@/lib/firebase/admin";
import type { HoneypotTrap } from "@/lib/types";
import { recordSecurityEvent } from "@/lib/server/events";

const TRAPS = "honeypots";

const DEFAULT_TRAPS: ReadonlyArray<Omit<HoneypotTrap, "id" | "createdAt" | "hits">> =
  [
    {
      name: "Fake Admin Portal",
      path: "/honeypot/admin",
      kind: "fake-admin",
      description: "Decoy admin login that captures unauthorized probing.",
    },
    {
      name: "Fake API Endpoint",
      path: "/api/honeypot/v1/users",
      kind: "fake-api",
      description: "Decoy API route returning realistic-looking errors.",
    },
    {
      name: "Hidden WP Path",
      path: "/honeypot/wp-login",
      kind: "hidden-route",
      description: "Trap for WordPress brute-force scanners.",
    },
  ];

export async function ensureDefaultTraps(): Promise<void> {
  const existing = await adminDb.collection(TRAPS).limit(1).get();
  if (!existing.empty) return;
  const batch = adminDb.batch();
  const now = Date.now();
  for (const t of DEFAULT_TRAPS) {
    const ref = adminDb.collection(TRAPS).doc();
    const trap: HoneypotTrap = {
      id: ref.id,
      createdAt: now,
      hits: 0,
      ...t,
    };
    batch.set(ref, trap);
  }
  await batch.commit();
}

export async function listTraps(): Promise<HoneypotTrap[]> {
  await ensureDefaultTraps();
  const snap = await adminDb.collection(TRAPS).orderBy("createdAt").get();
  return snap.docs.map((d) => d.data() as HoneypotTrap);
}

export async function triggerTrap(
  path: string,
  ctx: {
    ip: string | null;
    userAgent: string | null;
    method: string;
  },
): Promise<void> {
  const snap = await adminDb
    .collection(TRAPS)
    .where("path", "==", path)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (doc) {
    await doc.ref.update({ hits: (doc.data().hits ?? 0) + 1 });
  }
  await recordSecurityEvent({
    type: "honeypot.trigger",
    severity: "high",
    message: `Honeypot triggered: ${path}`,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    route: path,
    metadata: { method: ctx.method },
  });
}
