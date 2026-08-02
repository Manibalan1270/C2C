/**
 * Weekly leaderboard snapshot — the source of rank *history* and rank
 * movement. Current standings come from live `users` ordered by xp; this is
 * specifically the time series, which is why it's written once per week to a
 * doc keyed by the ISO week.
 */
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type LeaderboardEntry,
  type LeaderboardSnapshotDoc,
  type RankMovement,
  type UserDoc,
} from "../../src/types/schema";
import { isoWeekKey } from "../../src/lib/week";

const MAX_RANKED = 200;

export async function fetchRecentSnapshots(
  db: Firestore,
  max = 9,
): Promise<LeaderboardSnapshotDoc[]> {
  const snap = await db
    .collection(COLLECTIONS.leaderboardSnapshots)
    .orderBy("week", "desc")
    .limit(max)
    .get();
  return snap.docs.map((d) => d.data() as LeaderboardSnapshotDoc);
}

/**
 * Writes (or refreshes) this week's snapshot. Doc id is the ISO week key, so
 * running repeatedly through the week updates the same document rather than
 * accumulating one per run — the ranking reflects "as of the last sync",
 * and movement is always measured against the *previous* week's frozen
 * snapshot rather than against this week's earlier state. That matters: if
 * we diffed against the last run, movement would read as 0 almost always.
 */
export async function writeWeeklySnapshot(
  db: Firestore,
  dryRun: boolean,
): Promise<LeaderboardSnapshotDoc> {
  const week = isoWeekKey();

  const usersSnap = await db
    .collection(COLLECTIONS.users)
    .orderBy("xp", "desc")
    .limit(MAX_RANKED)
    .get();

  const rankings: LeaderboardEntry[] = usersSnap.docs.map((d, i) => {
    const data = d.data() as UserDoc;
    return { uid: d.id, name: data.name, xp: data.xp, rank: i + 1 };
  });

  // The most recent snapshot that isn't this week's — the baseline for
  // movement.
  const recent = await fetchRecentSnapshots(db, 3);
  const previousDoc = recent.find((s) => s.week !== week);
  const previousRankings = previousDoc?.rankings ?? [];
  const previousByUid = new Map(previousRankings.map((r) => [r.uid, r.rank]));

  const rankMovement: Record<string, { direction: RankMovement; delta: number }> = {};
  for (const entry of rankings) {
    const before = previousByUid.get(entry.uid);
    if (before == null) {
      // No prior snapshot for this member — "same, 0" rather than inventing
      // a huge jump from nowhere.
      rankMovement[entry.uid] = { direction: "same", delta: 0 };
      continue;
    }
    // Lower rank number is better, so an improvement is before > now.
    const delta = before - entry.rank;
    rankMovement[entry.uid] = {
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
      delta: Math.abs(delta),
    };
  }

  const doc: LeaderboardSnapshotDoc = {
    snapshotId: week,
    week,
    rankings,
    previousRankings,
    rankMovement,
    createdAt: Timestamp.now(),
  };

  if (!dryRun) {
    await db.collection(COLLECTIONS.leaderboardSnapshots).doc(week).set(doc);
  }

  return doc;
}
