/**
 * Turns "their solved count went up" into pointsLog entries and an XP delta.
 *
 * Idempotency is the whole point of this module, and it comes from the doc
 * id: the Nth easy solve a member ever records is always
 * `{uid}__leetcode__easy-{N}`. So awarding is "write ids
 * previous+1 .. current", and a re-run — where previous already equals
 * current — writes nothing. That matters a lot when the runner is a cron
 * job that can overlap, retry, or fire twice.
 *
 * The counts come from the platform's own lifetime totals rather than a
 * submission feed, because that feed is auth-gated (see
 * lib/platforms/leetcode.ts). Two honest consequences:
 *   - Awards are dated at sync time, so day-bucketing is accurate to the
 *     cron interval rather than to the actual solve.
 *   - A solve can't be matched to a specific weekly challenge, because we
 *     never learn which problem it was.
 */
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type PlatformSolvedCounts,
  type PointsLogDoc,
  type ProblemDifficulty,
} from "../../src/types/schema";
import { AWARD_BY_DIFFICULTY, AWARD_UNKNOWN } from "../../src/lib/gamification";
import { isoWeekKey } from "../../src/lib/week";

/** Safety valve: if a delta somehow comes back enormous (a platform glitch,
 *  or a member linking a second account), cap what one run can award rather
 *  than dumping thousands of docs and XP into the leaderboard. */
const MAX_AWARDS_PER_RUN = 100;

const DIFFICULTIES: ProblemDifficulty[] = ["easy", "medium", "hard"];

export interface AwardResult {
  newAwards: number;
  xpAwarded: number;
  pointsAwarded: number;
  capped: boolean;
}

const emptyResult: AwardResult = {
  newAwards: 0,
  xpAwarded: 0,
  pointsAwarded: 0,
  capped: false,
};

export function leetcodeAwardId(
  uid: string,
  difficulty: ProblemDifficulty,
  index: number,
): string {
  return `${uid}__leetcode__${difficulty}-${index}`;
}

export function hackerrankAwardId(uid: string, index: number): string {
  return `${uid}__hackerrank__badge-${index}`;
}

interface PlannedAward {
  docId: string;
  problem: string;
  platform: PointsLogDoc["platform"];
  difficulty: ProblemDifficulty | null;
}

function planLeetCode(
  uid: string,
  previous: PlatformSolvedCounts,
  current: PlatformSolvedCounts,
): PlannedAward[] {
  const planned: PlannedAward[] = [];
  for (const difficulty of DIFFICULTIES) {
    const from = previous[difficulty];
    const to = current[difficulty];
    for (let i = from + 1; i <= to; i++) {
      planned.push({
        docId: leetcodeAwardId(uid, difficulty, i),
        // Named for what we actually know. We don't have the problem title,
        // and inventing one would be worse than being plain about it.
        problem: `LeetCode ${difficulty} solve #${i}`,
        platform: "leetcode",
        difficulty,
      });
    }
  }
  return planned;
}

function planHackerRank(uid: string, previous: number, current: number): PlannedAward[] {
  const planned: PlannedAward[] = [];
  for (let i = previous + 1; i <= current; i++) {
    planned.push({
      docId: hackerrankAwardId(uid, i),
      problem: `HackerRank badge #${i}`,
      platform: "hackerrank",
      difficulty: null,
    });
  }
  return planned;
}

export async function awardProgress(
  db: Firestore,
  uid: string,
  plan: {
    leetcode?: { previous: PlatformSolvedCounts; current: PlatformSolvedCounts };
    hackerrank?: { previous: number; current: number };
  },
  dryRun: boolean,
  /**
   * Solves already credited as weekly challenges in this run, per difficulty.
   *
   * One solve must produce exactly one award. When a member solves the week's
   * medium challenge, the count-based delta and the challenge matcher both see
   * the same event — without this, it is written twice, paid twice, and
   * counted as two problems everywhere the UI counts award rows. The Dashboard
   * reported three problems solved for two actual solves because of it.
   *
   * Suppressing here rather than at read time is deliberate: a deduplicating
   * counter would have to guess which rows pair up, and count-based awards
   * carry no problem slug to pair them by. Not writing the duplicate in the
   * first place is the only version that is right by construction.
   */
  creditedAsChallenge: Partial<Record<ProblemDifficulty, number>> = {},
): Promise<AwardResult> {
  const planned: PlannedAward[] = [
    ...(plan.leetcode ? planLeetCode(uid, plan.leetcode.previous, plan.leetcode.current) : []),
    ...(plan.hackerrank
      ? planHackerRank(uid, plan.hackerrank.previous, plan.hackerrank.current)
      : []),
  ];

  // Drop one generic award per challenge credited at the same difficulty.
  // The skipped index is simply never issued — ids stay deterministic and the
  // stored bookmark still advances to the true total, so the gap can't cause
  // a re-award on a later run.
  const remaining = { ...creditedAsChallenge };
  const deduped = planned.filter((award) => {
    const d = award.difficulty;
    if (!d) return true;
    const left = remaining[d] ?? 0;
    if (left <= 0) return true;
    remaining[d] = left - 1;
    return false;
  });

  if (deduped.length === 0) return emptyResult;

  const capped = deduped.length > MAX_AWARDS_PER_RUN;
  const toWrite = capped ? deduped.slice(0, MAX_AWARDS_PER_RUN) : deduped;

  const now = Timestamp.now();
  const week = isoWeekKey(now.toDate());

  const batch = db.batch();
  let xpAwarded = 0;
  let pointsAwarded = 0;

  for (const item of toWrite) {
    const award = item.difficulty ? AWARD_BY_DIFFICULTY[item.difficulty] : AWARD_UNKNOWN;
    const ref = db.collection(COLLECTIONS.pointsLog).doc(item.docId);

    const body: PointsLogDoc = {
      logId: item.docId,
      uid,
      // Can't attribute to a challenge — we never learn which problem it was.
      challengeId: null,
      problem: item.problem,
      platform: item.platform,
      pointsAwarded: award.points,
      xpAwarded: award.xp,
      awardedAt: now,
      difficulty: item.difficulty,
      problemSlug: null,
      week,
    };

    // `create` would throw on a pre-existing doc; `set` makes a re-run
    // converge silently, which is what we want from a retried cron job.
    if (!dryRun) batch.set(ref, body);
    xpAwarded += award.xp;
    pointsAwarded += award.points;
  }

  if (!dryRun) await batch.commit();

  return { newAwards: toWrite.length, xpAwarded, pointsAwarded, capped };
}

/** Applies the XP delta atomically, so a concurrent run or an admin edit
 *  can't clobber the total. */
export async function applyXpDelta(
  db: Firestore,
  uid: string,
  xpDelta: number,
  dryRun: boolean,
): Promise<void> {
  if (dryRun || xpDelta === 0) return;
  await db.collection(COLLECTIONS.users).doc(uid).update({
    xp: FieldValue.increment(xpDelta),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
