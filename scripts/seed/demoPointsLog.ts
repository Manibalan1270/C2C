/**
 * Synthetic pointsLog entries so the Dashboard/Profile charts have
 * something real to render before the sync engine exists. Dev-only —
 * gated behind an explicit `--demo --uid=<uid>` flag in seedFirestore.ts,
 * never run against production data by accident.
 *
 * Idempotent via a deterministic doc id (`demo__{uid}__{n}`), so re-running
 * converges rather than piling up duplicates.
 */
import { Timestamp } from "firebase-admin/firestore";
import type { CodingPlatform, ProblemDifficulty } from "../../src/types/schema";
import { isoWeekKey } from "../../src/lib/week";

const DIFFICULTY_WEIGHTS: [ProblemDifficulty, number][] = [
  ["easy", 0.55],
  ["medium", 0.32],
  ["hard", 0.13],
];

function pickDifficulty(rand: () => number): ProblemDifficulty {
  const r = rand();
  let cumulative = 0;
  for (const [difficulty, weight] of DIFFICULTY_WEIGHTS) {
    cumulative += weight;
    if (r < cumulative) return difficulty;
  }
  return "easy";
}

const POINTS_BY_DIFFICULTY: Record<ProblemDifficulty, { points: number; xp: number }> = {
  easy: { points: 10, xp: 20 },
  medium: { points: 25, xp: 45 },
  hard: { points: 50, xp: 90 },
};

/** Small deterministic PRNG (mulberry32) so a given uid always generates
 *  the same demo data — reproducible without needing a fixed seed file. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (Math.imul(h, 31) + uid.charCodeAt(i)) | 0;
  return h;
}

export interface DemoLogSeed {
  docId: string;
  uid: string;
  logId: string;
  challengeId: null;
  problem: string;
  platform: CodingPlatform;
  pointsAwarded: number;
  xpAwarded: number;
  awardedAt: Timestamp;
  difficulty: ProblemDifficulty;
  problemSlug: string;
  week: string;
}

export function demoPointsLogSeeds(uid: string, count = 40): DemoLogSeed[] {
  const rand = mulberry32(hashSeed(uid));
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const logs: DemoLogSeed[] = [];
  for (let i = 0; i < count; i++) {
    // Spread across the last 14 days, weighted toward more recent days so
    // the activity chart doesn't look uniformly flat.
    const dayOffset = Math.floor(Math.pow(rand(), 1.4) * 14);
    const hourOffset = Math.floor(rand() * 20 + 2); // avoid exact midnight
    const awardedAtMs = now - dayOffset * dayMs - (24 - hourOffset) * 60 * 60 * 1000;
    const awardedAt = Timestamp.fromMillis(awardedAtMs);

    const difficulty = pickDifficulty(rand);
    const { points, xp } = POINTS_BY_DIFFICULTY[difficulty];
    const platform: CodingPlatform = rand() < 0.7 ? "leetcode" : "hackerrank";
    const problemSlug = `demo-problem-${i}`;

    logs.push({
      docId: `demo__${uid}__${i}`,
      uid,
      logId: `demo__${uid}__${i}`,
      challengeId: null,
      problem: `Demo Problem #${i + 1}`,
      platform,
      pointsAwarded: points,
      xpAwarded: xp,
      awardedAt,
      difficulty,
      problemSlug,
      week: isoWeekKey(new Date(awardedAtMs)),
    });
  }
  return logs;
}
