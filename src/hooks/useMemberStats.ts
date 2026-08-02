import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
import { fetchRecentPointsLog } from "../lib/queries/pointsLog";
import { fetchRecentSnapshots, rankHistoryFor, rankMovementFor } from "../lib/queries/snapshots";
import { bucketDailySolved, logsInWeek } from "../lib/stats";
import { isoWeekKey } from "../lib/week";
import type { DailySolvedEntry, RankMovement, WeeklyRankEntry } from "../types/schema";

export interface MemberStats {
  dailySolved: DailySolvedEntry[];
  rankHistory: WeeklyRankEntry[];
  rank: number | null;
  rankDirection: RankMovement;
  rankDelta: number;
  weeklySolvedCount: number;
  /** Whether this came from the sync engine's cached UserDoc.stats or was
   *  derived client-side from raw pointsLog/snapshots. The two converge to
   *  the same shape by construction — this is surfaced for debugging, not
   *  because callers need to branch on it. */
  source: "cache" | "derived";
}

/**
 * Dashboard's activity/rank data. Prefers `userDoc.stats` when it exists
 * and is fresh for the current week (the sync engine's cache); falls back
 * to deriving the same shape from pointsLog + leaderboardSnapshots when
 * the cache is absent or stale. The day the sync engine has run at least
 * once this week, every member takes the cache branch automatically —
 * there's no flag to flip.
 */
export function useMemberStats() {
  const { user, userDoc, docLoading } = useAuth();
  const week = isoWeekKey();

  const { data, loading, error, reload } = useAsync<MemberStats | null>(async () => {
    if (docLoading || !user) return null;

    const cache = userDoc?.stats;
    if (cache && cache.week === week) {
      return {
        dailySolved: cache.dailySolved,
        rankHistory: cache.rankHistory,
        rank: cache.rank,
        rankDirection: cache.rankDirection,
        rankDelta: cache.rankDelta,
        weeklySolvedCount: cache.weeklySolvedCount,
        source: "cache",
      };
    }

    const [logs, snaps] = await Promise.all([
      fetchRecentPointsLog(user.uid, 14),
      fetchRecentSnapshots(8),
    ]);
    const movement = rankMovementFor(user.uid, snaps);

    return {
      dailySolved: bucketDailySolved(logs, 14),
      rankHistory: rankHistoryFor(user.uid, snaps),
      rank: movement.rank,
      rankDirection: movement.direction,
      rankDelta: movement.delta,
      weeklySolvedCount: logsInWeek(logs, week).length,
      source: "derived",
    };
  }, [user?.uid, userDoc?.stats?.week, docLoading, week]);

  return { stats: data, loading: loading || docLoading, error, reload };
}
