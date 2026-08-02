import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
import { countSolvedByDifficulty } from "../lib/queries/pointsLog";
import type { ProblemDifficulty } from "../types/schema";

/**
 * Lifetime solved-by-difficulty for the Profile page — deliberately
 * separate from useMemberStats, which only covers a 14-day window for the
 * Dashboard's activity chart. This one uses the aggregation-count queries
 * so a member's whole history is accurate without pulling every log doc.
 */
export function useProfileBreakdown() {
  const { user, docLoading } = useAuth();

  const { data, loading, error } = useAsync<Record<ProblemDifficulty, number>>(async () => {
    if (docLoading || !user) return { easy: 0, medium: 0, hard: 0 };
    return countSolvedByDifficulty(user.uid);
  }, [user?.uid, docLoading]);

  const solvedByDifficulty = data ?? { easy: 0, medium: 0, hard: 0 };
  const total = solvedByDifficulty.easy + solvedByDifficulty.medium + solvedByDifficulty.hard;

  return { solvedByDifficulty, total, loading: loading || docLoading, error };
}
