import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function ensureConfig(): void {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      "Firebase client is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.",
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  ensureConfig();
  cachedApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function getFirebaseDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}

// Backwards-compatible Proxy exports — defer initialization until first
// property access so static prerender at build time does not crash when
// env vars are unavailable.
export const firebaseApp: FirebaseApp = new Proxy({} as FirebaseApp, {
  get: (_t, prop) => Reflect.get(getFirebaseApp() as object, prop),
});

export const firebaseAuth: Auth = new Proxy({} as Auth, {
  get: (_t, prop) => Reflect.get(getFirebaseAuth() as object, prop),
});

export const firebaseDb: Firestore = new Proxy({} as Firestore, {
  get: (_t, prop) => Reflect.get(getFirebaseDb() as object, prop),
});
