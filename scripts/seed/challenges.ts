/**
 * Current week's challenge set. These literals used to live in the
 * frontend as mock data; they now seed real Firestore docs, so the Weekly
 * Challenges page shows the same content it always has while reading it
 * from the database instead of a hardcoded array.
 */
import type { ChallengeTier, ProblemDifficulty } from "../../src/types/schema";
import { isoWeekKey } from "../../src/lib/week";

export interface ChallengeSeed {
  tier: ChallengeTier;
  difficulty: ProblemDifficulty | null;
  title: string;
  problemUrl: string | null;
  requiredCount: number;
  points: number;
  xp: number;
  order: number;
}

export function currentWeekChallengeSeeds(): {
  week: string;
  challenges: ChallengeSeed[];
} {
  return {
    week: isoWeekKey(),
    challenges: [
      {
        tier: "easy",
        difficulty: "easy",
        title: "Two Sum",
        problemUrl: "https://leetcode.com/problems/two-sum/",
        requiredCount: 1,
        points: 10,
        xp: 20,
        order: 0,
      },
      {
        tier: "medium",
        difficulty: "medium",
        title: "Longest Substring Without Repeating Characters",
        problemUrl:
          "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
        requiredCount: 1,
        points: 25,
        xp: 45,
        order: 1,
      },
      {
        tier: "hard",
        difficulty: "hard",
        title: "Merge k Sorted Lists",
        problemUrl: "https://leetcode.com/problems/merge-k-sorted-lists/",
        requiredCount: 1,
        points: 50,
        xp: 90,
        order: 2,
      },
      {
        tier: "surprise",
        difficulty: null,
        title: "Weekend Surprise: Build a Rate Limiter",
        problemUrl: null,
        requiredCount: 1,
        points: 75,
        xp: 120,
        order: 3,
      },
    ],
  };
}
