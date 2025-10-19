// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: "tldz-4e20f.firebaseapp.com",
  projectId: "tldz-4e20f",
  // IMPORTANT: this must be the BUCKET NAME, not the download domain
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tldz-4e20f.appspot.com",
  messagingSenderId: "158863095252",
  appId: "1:158863095252:web:cf021973d30dd57c9b1241",
  measurementId: "G-1J8757EB0P",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Do NOT override with a gs:// pointing at firebasestorage.app.
// If you want to be explicit, use the appspot.com bucket:
// export const storage = getStorage(app, "gs://tldz-4e20f.appspot.com");
export const storage = getStorage(app);

// quick client-side sanity log
if (typeof window !== "undefined") {
  console.log("[cfg] storageBucket =", (app.options as any).storageBucket);
}

