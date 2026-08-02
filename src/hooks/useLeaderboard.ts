import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
import { fetchRankByXp, fetchTopMembers, type LeaderboardRow } from "../lib/queries/users";
import { fetchRecentSnapshots } from "../lib/queries/snapshots";

/**
 * Which board is being shown.
 *
 * "allTime" is live — it reads current XP off the user documents. "weekly"
 * reads the most recent leaderboard snapshot, which the sync engine writes
 * once a week. They come from different places on purpose: an all-time board
 * has to be current to the minute, while a weekly board has to be *stable*
 * for the week it describes, and recomputing it live would change last week's
 * results every time someone solved something.
 */
export type LeaderboardScope = "weekly" | "allTime";

interface LeaderboardResult {
  entries: LeaderboardRow[];
  selfEntry: LeaderboardRow | null;
  selfInList: boolean;
  /** The week the snapshot covers, for the weekly scope. */
  week: string | null;
  /** True when weekly was asked for but no snapshot exists yet. */
  awaitingFirstSnapshot: boolean;
}

export function useLeaderboard(scope: LeaderboardScope = "allTime", max = 25) {
  const { user, userDoc } = useAuth();

  const { data, loading, error, reload } = useAsync<LeaderboardResult>(async () => {
    if (scope === "weekly") {
      const [snapshot] = await fetchRecentSnapshots(1);
      if (!snapshot) {
        return {
          entries: [],
          selfEntry: null,
          selfInList: false,
          week: null,
          awaitingFirstSnapshot: true,
        };
      }
      // Snapshot rankings carry no handle/level — that's display sugar the
      // sync engine doesn't persist. Fill what we can and leave the rest null
      // rather than firing N reads against `users` to decorate a list.
      const entries: LeaderboardRow[] = snapshot.rankings
        .slice(0, max)
        .map((r) => ({ ...r, handle: null, level: 1 }));
      const inList = user ? entries.find((e) => e.uid === user.uid) ?? null : null;
      return {
        entries,
        selfEntry: inList,
        selfInList: inList !== null,
        week: snapshot.week,
        awaitingFirstSnapshot: false,
      };
    }

    const entries = await fetchTopMembers(max);
    const inList = user ? entries.find((e) => e.uid === user.uid) ?? null : null;

    if (inList || !user || !userDoc) {
      return {
        entries,
        selfEntry: inList,
        selfInList: inList !== null,
        week: null,
        awaitingFirstSnapshot: false,
      };
    }

    // Not in the top N — one extra aggregation query for our own rank,
    // rather than pulling the whole users collection to find it.
    const rank = await fetchRankByXp(userDoc.xp);
    return {
      entries,
      selfEntry: {
        uid: user.uid,
        name: userDoc.name,
        xp: userDoc.xp,
        rank,
        handle: userDoc.leetcodeUsername ?? userDoc.hackerrankUsername ?? null,
        level: userDoc.level ?? 1,
      },
      selfInList: false,
      week: null,
      awaitingFirstSnapshot: false,
    };
  }, [user?.uid, userDoc?.xp, max, scope]);

  return {
    entries: data?.entries ?? [],
    selfEntry: data?.selfEntry ?? null,
    selfInList: data?.selfInList ?? false,
    week: data?.week ?? null,
    awaitingFirstSnapshot: data?.awaitingFirstSnapshot ?? false,
    loading,
    error,
    reload,
  };
}
