// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Prefer env vars; fall back to your project values for convenience during setup.
// IMPORTANT: The storageBucket must end with appspot.com, not firebasestorage.app.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "REPLACE_ME_IN_ENV",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tldz-4e20f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tldz-4e20f",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tldz-4e20f.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "158863095252",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:158863095252:web:cf021973d30dd57c9b1241",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1J8757EB0P",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Do NOT pass a second argument unless you’re intentionally overriding.
// This will use the storageBucket from config (tldz-4e20f.appspot.com).
export const storage = getStorage(app);

// Optional debug on the client (fixes `windows` typo → `window`)
if (typeof window !== "undefined") {
  (window as any)._fb = {
    projectId: app.options.projectId,
    storageBucket: app.options.storageBucket,
    authDomain: app.options.authDomain,
  };
  console.log("[FB DEBUG]", (window as any)._fb);
  console.log("[cfg] storageBucket =", (app.options as any).storageBucket);
}

