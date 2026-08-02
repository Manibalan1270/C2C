import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
import { fetchLatestWeeklyChallenges, fetchWeeklyGoal } from "../lib/queries/challenges";
import { fetchCompletedChallengeIds } from "../lib/queries/pointsLog";
import { DEFAULT_WEEKLY_GOAL } from "../lib/gamification";
import type { WeeklyChallengeDoc, WeeklyGoalDoc } from "../types/schema";

interface WeeklyChallengesResult {
  week: string | null;
  challenges: WeeklyChallengeDoc[];
  goal: Pick<WeeklyGoalDoc, "label" | "target">;
  /** Challenge ids the sync engine has credited this member for. */
  completedIds: Set<string>;
}

export function useWeeklyChallenges() {
  const { user } = useAuth();
  const uid = user?.uid;

  const { data, loading, error, reload } = useAsync<WeeklyChallengesResult>(async () => {
    const { week, challenges } = await fetchLatestWeeklyChallenges();
    // No week posted yet at all -> nothing to look a goal up for.
    const [goalDoc, completedIds] = await Promise.all([
      week ? fetchWeeklyGoal(week) : Promise.resolve(null),
      // Signed out shouldn't be possible on this route, but the hook must not
      // fire a query with an undefined uid if it ever is.
      uid ? fetchCompletedChallengeIds(uid) : Promise.resolve(new Set<string>()),
    ]);
    return {
      week,
      challenges,
      goal: goalDoc ?? DEFAULT_WEEKLY_GOAL,
      completedIds,
    };
  }, [uid]);

  return {
    week: data?.week ?? null,
    challenges: data?.challenges ?? [],
    goal: data?.goal ?? DEFAULT_WEEKLY_GOAL,
    completedIds: data?.completedIds ?? new Set<string>(),
    loading,
    error,
    reload,
  };
}
