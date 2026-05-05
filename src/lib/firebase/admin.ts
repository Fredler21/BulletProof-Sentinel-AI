import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON env var is required for Firebase Admin",
    );
  }
  const parsed = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

let cachedApp: App | null = null;
function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  cachedApp = initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

// Lazy proxies so importing this module never initializes Firebase Admin.
// Initialization happens on first property access (i.e. at request time).
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_t, prop, receiver) {
    return Reflect.get(getAdminAuth() as object, prop, receiver);
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_t, prop, receiver) {
    return Reflect.get(getAdminDb() as object, prop, receiver);
  },
});
