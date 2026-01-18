import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tldz-4e20f.firebasestorage.app").trim();
const appCheckKey = (process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY || "").trim();

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

// App Check (client only)
if (typeof window !== "undefined") {
  // Optional: allow a debug token in non-production, so you don't lock yourself out
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN) {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
  }

  if (appCheckKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
}
