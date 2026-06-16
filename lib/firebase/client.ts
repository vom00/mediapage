import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

// All values are public web-app config, not secrets. Real secrets
// (TMDB keys etc.) live server-side only and never use NEXT_PUBLIC_.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo-mediapage.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-mediapage",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "demo-app-id",
};

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

function createApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp(firebaseConfig);
}

export const app: FirebaseApp = createApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Connect emulators exactly once per JS context (survives HMR).
const globalFlags = globalThis as { __mediapageEmulators?: boolean };
if (useEmulators && !globalFlags.__mediapageEmulators) {
  globalFlags.__mediapageEmulators = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
