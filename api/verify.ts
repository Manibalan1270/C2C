/**
 * Live verification of a platform handle — "is this account real, and is its
 * history public?"
 *
 * Separate from api/sync.ts because it answers a different question at a
 * different moment: sync is "award me what I've earned", this is "did I type
 * my username correctly", asked the instant someone saves it. Folding it into
 * sync would mean a full XP recompute every time a member fixed a typo.
 *
 * Runs server-side for a hard reason, not a preference: LeetCode's GraphQL
 * endpoint sends no CORS headers, so a browser simply cannot call it. Any
 * verification the member sees has to be proxied.
 *
 * Same security posture as api/sync.ts — see the notes there. Additionally,
 * this one takes a username from the request body, which sync deliberately
 * never does. That is safe here because the value is only ever used as a
 * lookup against a third-party API and is written to the caller's OWN
 * document, never anyone else's. It is length-capped so the endpoint cannot be
 * turned into a generic URL-fetching machine.
 */
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminApp, adminDb } from "../scripts/lib/adminApp";
import { verifyPlatformHandle } from "../scripts/lib/platforms/verify";
import { COLLECTIONS, type CodingPlatform } from "../src/types/schema";

/** Per-member gap between verification requests, ms. */
const COOLDOWN_MS = 5_000;

/** Longest username we'll forward to a platform. Both cap well below this. */
const MAX_USERNAME = 64;

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
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  setHeader(k: string, v: string): void;
  json(body: unknown): void;
  end(): void;
}

const lastCall = new Map<string, number>();

export default async function handler(req: Req, res: Res) {
  const origin = String(req.headers.origin ?? "").replace(/\/$/, "");
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    console.warn(`[api/verify] blocked origin "${origin}" — add it to SYNC_ALLOWED_ORIGINS`);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const auth = String(req.headers.authorization ?? "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in and try again." });

  let uid: string;
  try {
    uid = (await getAuth(adminApp).verifyIdToken(token, true)).uid;
  } catch {
    return res.status(401).json({ error: "Your session expired. Sign in again." });
  }

  // In-memory rate limit. Good enough here precisely because it is NOT
  // security-critical: the worst case on a cold start is one extra request to
  // a platform. sync.ts uses a durable limit instead, because there the cost
  // of a miss is a real write.
  const now = Date.now();
  const since = now - (lastCall.get(uid) ?? 0);
  if (since < COOLDOWN_MS) {
    return res.status(429).json({ error: "Slow down a moment and try again." });
  }
  lastCall.set(uid, now);

  const body = (req.body ?? {}) as { platform?: string; username?: string };
  const platform = body.platform === "hackerrank" ? "hackerrank" : "leetcode";
  const username = String(body.username ?? "").trim();

  if (!username || username.length > MAX_USERNAME) {
    return res.status(400).json({ error: "Enter a username first." });
  }

  try {
    const result = await verifyPlatformHandle(platform as CodingPlatform, username);

    // Persist so the Profile shows the badge on next load without another
    // request to the platform.
    await adminDb
      .collection(COLLECTIONS.users)
      .doc(uid)
      .set(
        {
          platformStatus: {
            [platform]: {
              verified: result.verified,
              detailsPublic: result.detailsPublic,
              detail: result.detail,
              error: result.error,
              checkedAt: FieldValue.serverTimestamp(),
            },
          },
        },
        { merge: true },
      );

    return res.status(200).json(result);
  } catch (err) {
    console.error("[api/verify] failed", platform, err);
    return res.status(500).json({ error: "Couldn't reach the platform. Try again." });
  }
}
