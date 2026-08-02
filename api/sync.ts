/**
 * On-demand sync for a single member — the "Refresh my stats" button.
 *
 * Deploy target: any Node serverless runtime (Vercel, Netlify Functions).
 * NOT Cloudflare Workers — those are V8 isolates without Node APIs, and
 * firebase-admin needs both. Running there would mean reimplementing the whole
 * Firestore layer against the REST API, i.e. a second copy of the data access
 * code that would drift from the first.
 *
 * ============================ SECURITY ============================
 * This endpoint holds a service-account key, which bypasses every Firestore
 * rule. Three properties keep that safe, and none of them are optional:
 *
 * 1. It ONLY ever syncs the caller's own uid, taken from a verified Firebase
 *    ID token. The uid is never read from the request body — a body-supplied
 *    uid would let anyone force a sync for any member, which is a (mild) DoS
 *    against LeetCode on someone else's behalf.
 * 2. It verifies the token signature via the Admin SDK. An unverified token is
 *    just a string an attacker typed.
 * 3. It rate-limits per member using their own lastSyncedAt, so a held-down
 *    button cannot turn into a request flood against LeetCode. We are a guest
 *    on their infrastructure; the rate limit protects THEM, not us.
 *
 * The key must live in the platform's environment variables. It must never be
 * in the client bundle, in the repo, or in an env var prefixed VITE_ (Vite
 * inlines those into the browser build).
 * ==================================================================
 */
import { getAuth } from "firebase-admin/auth";
import { adminApp, adminDb } from "../scripts/lib/adminApp";
import { COLLECTIONS, type BadgeDoc, type UserDoc } from "../src/types/schema";
import { loadMatchableChallenges } from "../scripts/sync/awardChallenges";
import { fetchRecentSnapshots } from "../scripts/sync/snapshot";
import { syncMember } from "../scripts/sync/syncMember";

/** Minimum gap between one member's manual refreshes. */
const COOLDOWN_MS = 30_000;

/**
 * Origins allowed to call this.
 *
 * An open CORS policy would let any site on the internet drive requests
 * through this endpoint using a visitor's token, so the list stays explicit.
 *
 * Driven by SYNC_ALLOWED_ORIGINS (comma-separated) so moving the site to a
 * custom domain is an environment-variable change, not a code change. This
 * matters more than it looks: when the club buys a domain, the browser starts
 * sending a new `Origin` header, the endpoint doesn't recognise it, and the
 * browser blocks the response. Nothing errors server-side and the Vercel logs
 * look perfectly healthy — the button just stops working, which is the hardest
 * class of bug to trace back to its cause.
 *
 * The fallback keeps the default Firebase Hosting domains and localhost
 * working when the variable is unset.
 */
const DEFAULT_ORIGINS = [
  "https://c2cwebsite-b11a3.web.app",
  "https://c2cwebsite-b11a3.firebaseapp.com",
  "http://localhost:5173",
];

const ALLOWED_ORIGINS = (process.env.SYNC_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)
  .concat(DEFAULT_ORIGINS);

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  setHeader(k: string, v: string): void;
  json(body: unknown): void;
  end(): void;
}

function applyCors(req: Req, res: Res) {
  const origin = String(req.headers.origin ?? "").replace(/\/$/, "");
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    // Logged, because the alternative is a silent failure that looks like a
    // broken button. This line is the first thing to check after a domain move.
    console.warn(
      `[api/sync] blocked origin "${origin}" — add it to SYNC_ALLOWED_ORIGINS`,
    );
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export default async function handler(req: Req, res: Res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const header = String(req.headers.authorization ?? "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Sign in and try again." });
  }

  let uid: string;
  try {
    // Signature-verified. `checkRevoked` is on so a signed-out or disabled
    // account can't keep using a token that hasn't expired yet.
    const decoded = await getAuth(adminApp).verifyIdToken(token, true);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Your session expired. Sign in again." });
  }

  try {
    const userSnap = await adminDb.collection(COLLECTIONS.users).doc(uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "No profile found for this account." });
    }
    const user = userSnap.data() as UserDoc;

    if (!user.leetcodeUsername && !user.hackerrankUsername) {
      return res.status(400).json({
        error: "Link a coding account on your profile first.",
      });
    }

    // Rate limit from the member's own record — no extra store needed, and it
    // survives cold starts, which an in-memory counter would not.
    const last = user.lastSyncedAt?.toMillis?.() ?? 0;
    const waitMs = COOLDOWN_MS - (Date.now() - last);
    if (waitMs > 0) {
      res.setHeader("Retry-After", String(Math.ceil(waitMs / 1000)));
      return res.status(429).json({
        error: `Just checked. Try again in ${Math.ceil(waitMs / 1000)}s.`,
        retryInSeconds: Math.ceil(waitMs / 1000),
      });
    }

    const [badgeSnap, challengesBySlug, snapshots] = await Promise.all([
      adminDb.collection(COLLECTIONS.badges).get(),
      loadMatchableChallenges(adminDb),
      fetchRecentSnapshots(adminDb, 9),
    ]);
    const badges = badgeSnap.docs.map((d) => d.data() as BadgeDoc);

    const summary = await syncMember(user, badges, challengesBySlug, snapshots, false);

    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    // Never surface the raw error: it can carry project ids and internal paths.
    console.error("[api/sync] failed for", uid, err);
    return res.status(500).json({ error: "Sync failed. Try again in a minute." });
  }
}
