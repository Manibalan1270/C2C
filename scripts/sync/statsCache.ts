/**
 * Builds the denormalised `UserDoc.stats` object the dashboard reads.
 *
 * The client already derives this exact shape itself when the cache is
 * missing or stale (see src/hooks/useMemberStats.ts), and both sides call
 * the same pure helpers in src/lib/stats.ts — so this isn't a second
 * implementation that could drift, it's the same computation done ahead of
 * time so the dashboard costs one document read instead of ~50.
 */
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type LeaderboardSnapshotDoc,
  type PointsLogDoc,
  type ProblemDifficulty,
  type UserStatsCache,
} from "../../src/types/schema";
import { bucketDailySolved, logsInWeek } from "../../src/lib/stats";
import { isoWeekKey } from "../../src/lib/week";

export async function buildStatsCache(
  db: Firestore,
  uid: string,
  snapshots: LeaderboardSnapshotDoc[],
  solvedByDifficulty: Record<ProblemDifficulty, number>,
  totalSolved: number,
): Promise<UserStatsCache> {
  const week = isoWeekKey();
  const since = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const snap = await db
    .collection(COLLECTIONS.pointsLog)
    .where("uid", "==", uid)
    .where("awardedAt", ">=", since)
    .orderBy("awardedAt", "asc")
    .get();

  const logs = snap.docs.map((d) => d.data() as PointsLogDoc);

  // Newest first, so [0] is the most recent week.
  const ordered = [...snapshots].sort((a, b) => (a.week < b.week ? 1 : -1));
  const latest = ordered[0];
  const entry = latest?.rankings.find((r) => r.uid === uid) ?? null;
  const movement = latest?.rankMovement[uid];
  const previous = ordered[1]?.rankings.find((r) => r.uid === uid) ?? null;

  const rankHistory = ordered
    .slice(0, 8)
    .flatMap((s) => {
      const found = s.rankings.find((r) => r.uid === uid);
      return found ? [{ week: s.week, rank: found.rank }] : [];
    })
    .reverse(); // oldest -> newest, the order Sparkline expects

  return {
    week,
    rank: entry?.rank ?? null,
    previousRank: previous?.rank ?? null,
    rankDirection: movement?.direction ?? "same",
    rankDelta: movement?.delta ?? 0,
    rankHistory,
    dailySolved: bucketDailySolved(logs, 14),
    solvedByDifficulty,
    weeklySolvedCount: logsInWeek(logs, week).length,
    totalSolved,
    computedAt: Timestamp.now(),
  };
}
