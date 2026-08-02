import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Analytics, loaded after the fact.
 *
 * Imported dynamically rather than at the top of the file so it isn't part of
 * the bundle the browser has to parse before first paint. Nothing renders
 * because of analytics, so it has no business competing with the code that
 * does — and this way a visitor who blocks trackers never downloads it at all.
 *
 * `isSupported()` still gates it: analytics needs browser APIs it doesn't have
 * in SSR/test environments.
 */
void (async () => {
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) getAnalytics(app);
  } catch {
    // Blocked by an extension, or unsupported. Never a reason to break the app.
  }
})();
