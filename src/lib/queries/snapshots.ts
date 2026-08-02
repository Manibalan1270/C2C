import { collection, getDocs, limit as fbLimit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import {
  COLLECTIONS,
  type LeaderboardSnapshotDoc,
  type RankMovement,
  type WeeklyRankEntry,
} from "../../types/schema";

/** Most recent snapshots, newest first. */
export async function fetchRecentSnapshots(max = 8): Promise<LeaderboardSnapshotDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.leaderboardSnapshots),
      orderBy("week", "desc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as LeaderboardSnapshotDoc);
}

/**
 * A member's rank across the given snapshots, oldest -> newest — the shape
 * `Sparkline` expects. `snaps` may be in either order; this always returns
 * ascending by week regardless of the input order.
 */
export function rankHistoryFor(
  uid: string,
  snaps: LeaderboardSnapshotDoc[],
): WeeklyRankEntry[] {
  const entries: WeeklyRankEntry[] = [];
  for (const snap of snaps) {
    const entry = snap.rankings.find((r) => r.uid === uid);
    if (entry) entries.push({ week: snap.week, rank: entry.rank });
  }
  return entries.sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0));
}

/**
 * Rank + movement from the single most recent snapshot. `snaps` may be in
 * either order — this picks the newest by week itself rather than trusting
 * caller ordering. Returns a "same, 0" placeholder when the member has no
 * snapshot yet (e.g. before the sync engine's first weekly run), so the
 * dashboard has something honest to render rather than nothing.
 */
export function rankMovementFor(
  uid: string,
  snaps: LeaderboardSnapshotDoc[],
): { rank: number | null; direction: RankMovement; delta: number } {
  const latest = [...snaps].sort((a, b) => (a.week < b.week ? 1 : -1))[0];
  if (!latest) return { rank: null, direction: "same", delta: 0 };

  const entry = latest.rankings.find((r) => r.uid === uid);
  const movement = latest.rankMovement[uid];

  return {
    rank: entry?.rank ?? null,
    direction: movement?.direction ?? "same",
    delta: movement?.delta ?? 0,
  };
}
