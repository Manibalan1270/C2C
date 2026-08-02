import {
  collection,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, type PointsLogDoc, type ProblemDifficulty } from "../../types/schema";

const DIFFICULTIES: ProblemDifficulty[] = ["easy", "medium", "hard"];

/**
 * A member's pointsLog entries from the last `sinceDays` days. Uses the
 * (uid, awardedAt) composite index — see firestore.indexes.json.
 */
export async function fetchRecentPointsLog(
  uid: string,
  sinceDays = 14,
): Promise<PointsLogDoc[]> {
  const since = Timestamp.fromMillis(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.pointsLog),
      where("uid", "==", uid),
      where("awardedAt", ">=", since),
      orderBy("awardedAt", "asc"),
    ),
  );
  return snap.docs.map((d) => d.data() as PointsLogDoc);
}

/**
 * The challenge ids this member has been credited for.
 *
 * Reads the award documents the sync engine writes when it matches a solved
 * problem slug to a challenge (see scripts/sync/awardChallenges.ts). Queried
 * by `challengeId != null` rather than by a separate "completions" collection,
 * because the award *is* the completion — a second collection would be a
 * duplicate that could disagree with the ledger it was derived from.
 */
export async function fetchCompletedChallengeIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.pointsLog),
      where("uid", "==", uid),
      where("challengeId", "!=", null),
    ),
  );
  const ids = new Set<string>();
  for (const doc of snap.docs) {
    const { challengeId } = doc.data() as PointsLogDoc;
    if (challengeId) ids.add(challengeId);
  }
  return ids;
}

/**
 * Lifetime solved-by-difficulty via three aggregation queries rather than
 * pulling every log doc a member has ever generated. Uses the
 * (uid, difficulty) composite index.
 */
export async function countSolvedByDifficulty(
  uid: string,
): Promise<Record<ProblemDifficulty, number>> {
  const counts = await Promise.all(
    DIFFICULTIES.map((difficulty) =>
      getCountFromServer(
        query(
          collection(db, COLLECTIONS.pointsLog),
          where("uid", "==", uid),
          where("difficulty", "==", difficulty),
        ),
      ),
    ),
  );

  return {
    easy: counts[0].data().count,
    medium: counts[1].data().count,
    hard: counts[2].data().count,
  };
}
