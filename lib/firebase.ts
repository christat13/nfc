import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// IMPORTANT:
// - Trim env vars to avoid hidden newline characters (\n) that break Storage URLs (shows up as %0A).
// - Use the correct default bucket for this project: tldz-4e20f.firebasestorage.app

const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tldz-4e20f.firebasestorage.app").trim();

const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
  authDomain: "tldz-4e20f.firebaseapp.com",
  projectId: "tldz-4e20f",
  storageBucket,
  appId: "1:158863095252:web:cf021973d30dd57c9b1241",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);