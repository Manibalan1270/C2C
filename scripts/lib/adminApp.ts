/**
 * Admin SDK bootstrap for one-off scripts (seeding, promotion). This module
 * is also what the sync-engine pass will reuse verbatim — the env-var form
 * of the credential is deliberate, because that's exactly how the GitHub
 * Actions secret will arrive there. Getting this shape right now makes that
 * pass copy-paste rather than a rewrite.
 */
import "dotenv/config";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Two supported ways to supply the key, in priority order.
 *
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON — the whole key file as one line. This is
 *    the form GitHub Actions needs, because a secret is a string and there is
 *    no file to point at.
 *
 * 2. GOOGLE_APPLICATION_CREDENTIALS — a path to the downloaded key file. Much
 *    better for local development: the private key never gets pasted into
 *    .env, so it can't be leaked by someone screen-sharing their editor or
 *    grepping their own dotfiles. The Admin SDK reads this variable itself
 *    when `initializeApp()` is called with no explicit credential.
 */
function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return cert(JSON.parse(raw));
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but isn't valid JSON. " +
          "Paste the full downloaded key file contents as one line.",
      );
    }
  }
  return null;
}

function bootstrap(): App {
  if (getApps().length > 0) return getApps()[0];

  const credential = loadCredential();
  if (credential) return initializeApp({ credential });

  // Path form. This branch previously did not exist — the function threw
  // instead, so GOOGLE_APPLICATION_CREDENTIALS was documented in the error
  // message above but never actually honoured. Calling initializeApp() with
  // no credential is what triggers the SDK's own default lookup.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
  }

  throw new Error(
    "No credentials found. Either set GOOGLE_APPLICATION_CREDENTIALS in .env " +
      "to the path of your downloaded key file (preferred locally), or set " +
      "FIREBASE_SERVICE_ACCOUNT_JSON to the file's contents as one line " +
      "(required for GitHub Actions). See .env.example.",
  );
}

export const adminApp: App = bootstrap();
export const adminDb: Firestore = getFirestore(adminApp);
