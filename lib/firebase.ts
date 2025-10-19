// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: "tldz-4e20f.firebaseapp.com",
  projectId: "tldz-4e20f",

  // IMPORTANT: the default bucket host is *.appspot.com (not *.firebasestorage.app)
  storageBucket: "tldz-4e20f.appspot.com",

  appId: "1:158863095252:web:cf021973d30dd57c9b1241",
  messagingSenderId: "158863095252",
  measurementId: "G-1J8757EB0P",
};

export const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Use the default bucket (don’t override with a URL string)
export const storage = getStorage(app);

// Optional debugging in the browser console
if (typeof window !== "undefined") {
  console.log("[cfg] projectId =", app.options.projectId);
  console.log("[cfg] storageBucket =", (app.options as any).storageBucket); // should log “tldz-4e20f.appspot.com”
}


