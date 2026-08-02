/**
 * Pure aggregation over PointsLogDoc arrays — no Firebase reads, no React.
 * The sync engine imports these unchanged so its stored `UserStatsCache`
 * and the client's derived fallback bucket identically.
 */
import type { PointsLogDoc, ProblemDifficulty } from "../types/schema";
import { dayKey, isoWeekKey, lastNDayKeys } from "./week";

const DIFFICULTIES: ProblemDifficulty[] = ["easy", "medium", "hard"];

function toDate(ts: PointsLogDoc["awardedAt"]): Date {
  // Firestore Timestamps have toDate(); tolerate a plain Date too, since
  // seed scripts and tests may construct logs without a real Timestamp.
  return typeof (ts as { toDate?: () => Date })?.toDate === "function"
    ? (ts as { toDate: () => Date }).toDate()
    : (ts as unknown as Date);
}

/**
 * Solved counts per day for the last `days` days (default 14), oldest
 * first, zero-filled — the shape `ColumnChart` and `UserStatsCache.
 * dailySolved` both expect.
 */
export function bucketDailySolved(
  logs: PointsLogDoc[],
  days = 14,
  end: Date = new Date(),
): { date: string; count: number }[] {
  const keys = lastNDayKeys(days, end);
  const counts = new Map(keys.map((k) => [k, 0]));

  for (const log of logs) {
    const key = dayKey(toDate(log.awardedAt));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/** Solved counts by difficulty, zero-filled for every known difficulty. */
export function countByDifficulty(
  logs: PointsLogDoc[],
): Record<ProblemDifficulty, number> {
  const counts: Record<ProblemDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  for (const log of logs) {
    if (log.difficulty && DIFFICULTIES.includes(log.difficulty)) {
      counts[log.difficulty] += 1;
    }
  }
  return counts;
}

/** Logs whose awardedAt falls within the given ISO week key. */
export function logsInWeek(logs: PointsLogDoc[], week: string): PointsLogDoc[] {
  if (logs.length === 0) return [];
  // Prefer the denormalised `week` field when present; fall back to
  // recomputing from awardedAt for older/hand-seeded docs that lack it.
  return logs.filter((log) =>
    log.week ? log.week === week : isoWeekKey(toDate(log.awardedAt)) === week,
  );
}
