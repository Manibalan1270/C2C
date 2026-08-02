import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, type LeaderboardEntry, type UserDoc } from "../../types/schema";

/**
 * Live subscription to a member's own profile document. AuthContext is the
 * one place this gets called — everything else reads the doc back out of
 * context rather than opening a second listener on the same document.
 */
export function subscribeToUserDoc(
  uid: string,
  onNext: (doc: UserDoc | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.users, uid),
    (snap) => onNext(snap.exists() ? (snap.data() as UserDoc) : null),
    (err) => onError(err),
  );
}

/**
 * Saves a member's own LeetCode/HackerRank handles. `patch` values must
 * already be normalised/validated (see src/lib/validation.ts) — this
 * function does not re-validate, it only writes.
 */
export async function updatePlatformUsernames(
  uid: string,
  patch: { leetcodeUsername?: string | null; hackerrankUsername?: string | null },
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * A leaderboard row as the UI wants it.
 *
 * Extends the frozen `LeaderboardEntry` contract rather than editing it —
 * that shape is also what the sync engine writes into snapshot documents, and
 * `handle`/`level` are display sugar the engine has no reason to persist.
 */
export interface LeaderboardRow extends LeaderboardEntry {
  /** Public coding handle, shown as "@name". Null if they've linked neither. */
  handle: string | null;
  level: number;
}

/** Current standings, live — not the weekly snapshot history. */
export async function fetchTopMembers(max = 25): Promise<LeaderboardRow[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.users), orderBy("xp", "desc"), fbLimit(max)),
  );
  return snap.docs.map((d, i) => {
    const data = d.data() as UserDoc;
    return {
      uid: d.id,
      name: data.name,
      xp: data.xp,
      rank: i + 1,
      handle: data.leetcodeUsername ?? data.hackerrankUsername ?? null,
      level: data.level ?? 1,
    };
  });
}

/**
 * 1-based rank by XP for a member who may not be in the top-N list above —
 * one aggregation query rather than pulling every user doc.
 */
export async function fetchRankByXp(xp: number): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, COLLECTIONS.users), where("xp", ">", xp)),
  );
  return snap.data().count + 1;
}
