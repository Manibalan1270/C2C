/**
 * Streaks, levels, and badges — everything derived from a member's award
 * history rather than tracked incrementally.
 *
 * Deriving rather than incrementing is deliberate: an incremental streak
 * counter is only correct if every run happens, in order, exactly once. A
 * cron job on a free runner does not guarantee that. Recomputing from
 * pointsLog is a few more reads and is self-healing after a missed run.
 */
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type BadgeDoc,
  type PlatformSolvedCounts,
  type PointsLogDoc,
  type ProblemDifficulty,
  type UserDoc,
} from "../../src/types/schema";
import { levelForXp } from "../../src/lib/gamification";
import { dayKey } from "../../src/lib/week";

/** How far back to look when recomputing a streak. A streak longer than
 *  this is capped, which is a deliberate trade against reading a member's
 *  entire history every run. */
const STREAK_WINDOW_DAYS = 400;

export interface Progression {
  currentStreak: number;
  bestStreak: number;
  level: number;
  totalSolved: number;
  solvedByDifficulty: Record<ProblemDifficulty, number>;
  newBadgeIds: string[];
}

/**
 * Current and best streak in club-local days.
 *
 * "Current" allows today OR yesterday as the most recent day — a member who
 * solved yesterday but hasn't yet solved today still has a live streak; only
 * a full missed day breaks it. Without that grace, everyone's streak would
 * read as 0 for most of every morning.
 */
export function computeStreaks(dayKeys: Set<string>): {
  currentStreak: number;
  bestStreak: number;
} {
  if (dayKeys.size === 0) return { currentStreak: 0, bestStreak: 0 };

  const sorted = [...dayKeys].sort(); // "YYYY-MM-DD" sorts chronologically
  const dayMs = 24 * 60 * 60 * 1000;

  // Best streak: longest run of consecutive calendar days anywhere.
  let bestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const cur = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    if (cur - prev === dayMs) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 1;
    }
  }

  // Current streak: walk backwards from today (or yesterday) while each
  // previous day is present.
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - dayMs));
  let cursor: string | null = dayKeys.has(today)
    ? today
    : dayKeys.has(yesterday)
      ? yesterday
      : null;

  let currentStreak = 0;
  while (cursor && dayKeys.has(cursor)) {
    currentStreak += 1;
    const prevDate = new Date(new Date(`${cursor}T00:00:00Z`).getTime() - dayMs);
    cursor = dayKey(prevDate);
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

function meetsCriteria(
  badge: BadgeDoc,
  stats: {
    totalSolved: number;
    hardSolved: number;
    currentStreak: number;
    xp: number;
  },
): boolean {
  switch (badge.criteriaType) {
    case "first_solve":
      return stats.totalSolved >= 1;
    case "total_solved":
      return stats.totalSolved >= badge.criteriaValue;
    case "hard_solved":
      return stats.hardSolved >= badge.criteriaValue;
    case "streak_days":
      return stats.currentStreak >= badge.criteriaValue;
    case "xp_total":
      return stats.xp >= badge.criteriaValue;
    // Awarded by a human, never inferred.
    case "manual":
    case "weekly_sweep":
      return false;
    default:
      return false;
  }
}

export async function computeProgression(
  db: Firestore,
  user: UserDoc,
  badges: BadgeDoc[],
  newXp: number,
  /**
   * Lifetime counts straight from the platform, when available. Preferred
   * over counting pointsLog rows for the *displayed* breakdown: pointsLog
   * only contains what the club has observed since the member linked their
   * account, whereas this is their real total. Streaks still come from
   * pointsLog, because that's club-observed activity over time.
   */
  platformCounts: PlatformSolvedCounts | null,
): Promise<Progression> {
  const since = Timestamp.fromMillis(
    Date.now() - STREAK_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const snap = await db
    .collection(COLLECTIONS.pointsLog)
    .where("uid", "==", user.uid)
    .where("awardedAt", ">=", since)
    .get();

  const logs = snap.docs.map((d) => d.data() as PointsLogDoc);

  const dayKeys = new Set<string>();
  const observedByDifficulty: Record<ProblemDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  for (const log of logs) {
    dayKeys.add(dayKey(log.awardedAt.toDate()));
    if (log.difficulty) observedByDifficulty[log.difficulty] += 1;
  }

  const { currentStreak, bestStreak } = computeStreaks(dayKeys);
  const solvedByDifficulty = platformCounts ?? observedByDifficulty;
  const totalSolved =
    solvedByDifficulty.easy + solvedByDifficulty.medium + solvedByDifficulty.hard;

  const held = new Set(user.badgeIds ?? []);
  const newBadgeIds = badges
    .filter(
      (badge) =>
        !held.has(badge.badgeId) &&
        meetsCriteria(badge, {
          totalSolved,
          hardSolved: solvedByDifficulty.hard,
          currentStreak,
          xp: newXp,
        }),
    )
    .map((badge) => badge.badgeId);

  return {
    currentStreak,
    // Never regress a personal best just because it fell outside the window.
    bestStreak: Math.max(bestStreak, user.bestStreak ?? 0),
    level: levelForXp(newXp),
    totalSolved,
    solvedByDifficulty,
    newBadgeIds,
  };
}
