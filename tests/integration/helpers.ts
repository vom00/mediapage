// Helpers for integration tests that run against the Firebase
// Emulator Suite with the offline demo- project. Each test client
// gets its own app instance so multiple signed-in users can act in
// the same test.

import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  type Auth,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

export const PROJECT_ID = "demo-mediapage";
const FIRESTORE_HOST = "127.0.0.1";
const FIRESTORE_PORT = 8080;
const AUTH_URL = "http://127.0.0.1:9099";
const STORAGE_HOST = "127.0.0.1";
const STORAGE_PORT = 9199;

export interface TestClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let appCounter = 0;

export function createTestClient(): TestClient {
  const app = initializeApp(
    {
      apiKey: "demo-api-key",
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.appspot.com`,
      appId: "demo-app-id",
    },
    `it-${Date.now()}-${appCounter++}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
  const storage = getStorage(app);
  connectStorageEmulator(storage, STORAGE_HOST, STORAGE_PORT);
  return { app, auth, db, storage };
}

export async function destroyTestClient(client: TestClient): Promise<void> {
  await deleteApp(client.app);
}

export async function clearEmulatorData(): Promise<void> {
  const firestore = await fetch(
    `http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  const accounts = await fetch(
    `${AUTH_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );
  if (!firestore.ok || !accounts.ok) {
    throw new Error("Failed to clear emulator data between tests");
  }
}

let userCounter = 0;

export async function signUpTestUser(auth: Auth): Promise<User> {
  const email = `user-${Date.now()}-${userCounter++}@example.com`;
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    "password-123",
  );
  return credential.user;
}
