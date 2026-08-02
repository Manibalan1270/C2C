import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
import { countSolvedByDifficulty } from "../lib/queries/pointsLog";
import type { ProblemDifficulty } from "../types/schema";

/**
 * Lifetime solved-by-difficulty for the Profile page.
 *
 * Reads the sync engine's cached `stats.solvedByDifficulty`, which comes
 * straight from LeetCode's own lifetime totals. It deliberately does NOT
 * count pointsLog documents any more, and that distinction is the whole
 * point of this hook:
 *
 *   pointsLog counts AWARDS, not PROBLEMS.
 *
 * There are two award paths — a count-based one ("your solved total went up")
 * and a challenge one ("you solved this specific problem") — and a single
 * solve legitimately triggers both when the problem happens to be that week's
 * challenge. Counting rows therefore reported one solve as two, and the
 * Profile showed 4 problems for 3 distinct solves. Awards are also gapped by
 * design: the first sync baselines a member's existing solves without writing
 * any award at all, so pointsLog can never be a complete record of what
 * someone has solved.
 *
 * The pointsLog count survives only as a fallback for the window before the
 * first sync has run, when `stats` doesn't exist yet. It's wrong in the same
 * way described above, but a rough number beats an empty panel, and it is
 * replaced the moment the engine runs once.
 */
export function useProfileBreakdown() {
  const { user, userDoc, docLoading } = useAuth();
  const cached = userDoc?.stats?.solvedByDifficulty ?? null;

  const { data, loading, error } = useAsync<Record<ProblemDifficulty, number>>(async () => {
    if (docLoading || !user) return { easy: 0, medium: 0, hard: 0 };
    if (cached) return cached;
    return countSolvedByDifficulty(user.uid);
  }, [user?.uid, docLoading, cached]);

  const solvedByDifficulty = data ?? { easy: 0, medium: 0, hard: 0 };
  const total = solvedByDifficulty.easy + solvedByDifficulty.medium + solvedByDifficulty.hard;

  return { solvedByDifficulty, total, loading: loading || docLoading, error };
}
