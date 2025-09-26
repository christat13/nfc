// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "qs",
  authDomain: "tldz-4e20f.firebaseapp.com",
  projectId: "tldz-4e20f",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "tldz-4e20f.firebasestorage.app",
  messagingSenderId: "158863095252",
  appId: "1:158863095252:web:cf021973d30dd57c9b1241",
  measurementId: "G-1J8757EB0P",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Force correct bucket regardless of env var
export const storage = getStorage(app, "gs://tldz-4e20f.firebasestorage.app");

// sanity log on client
if (typeof window !== "undefined") {
  // should print: tldz-4e20f.firebasestorage.app
  console.log("[cfg] storageBucket =", (auth.app.options as any).storageBucket);
}
