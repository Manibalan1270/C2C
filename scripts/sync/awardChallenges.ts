/**
 * Matches a member's recently solved problems against the weekly challenges
 * and awards the challenge's own XP for the ones they actually did.
 *
 * This is separate from awardSolves.ts and both run. They answer different
 * questions:
 *   - awardSolves: "your solve count went up" -> baseline XP per difficulty
 *   - here:        "you solved THIS problem"  -> the challenge's own XP
 *
 * ONE SOLVE, ONE AWARD. This runs first, and the difficulties it credits are
 * passed to awardProgress so it skips the generic award for the same solve.
 * Previously both fired: solving the week's medium challenge wrote two rows,
 * paid twice, and made the Dashboard report two problems as three — every
 * counter in the UI counts award rows, so a duplicate row is a duplicate
 * problem as far as they can tell.
 *
 * The challenge still pays more than a generic solve of the same difficulty
 * would, which is the actual incentive to do the club's pick. It just isn't
 * paid *on top of* it any more.
 *
 * Idempotency, as everywhere in the engine, comes from a deterministic doc id
 * — `{uid}__challenge__{challengeId}`. A challenge can only ever be awarded
 * once per member no matter how many times the cron fires, how many times they
 * resubmit the problem, or how long the solve stays in their recent feed.
 */
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type PointsLogDoc,
  type ProblemDifficulty,
  type WeeklyChallengeDoc,
} from "../../src/types/schema";
import { slugFromProblemUrl } from "../../src/lib/problemSlug";
import { isoWeekKey } from "../../src/lib/week";
import type { RecentSolve } from "../lib/platforms/leetcode";

export interface ChallengeAwardResult {
  newAwards: number;
  xpAwarded: number;
  pointsAwarded: number;
  /** Titles awarded this run, for the log line. */
  titles: string[];
  /**
   * Count of solves credited here, per difficulty.
   *
   * Handed to awardProgress so it can suppress the generic award for the same
   * solve — see the note on its `creditedAsChallenge` parameter. Without this
   * one solve is paid and counted twice.
   */
  byDifficulty: Partial<Record<ProblemDifficulty, number>>;
}

const empty: ChallengeAwardResult = {
  newAwards: 0,
  xpAwarded: 0,
  pointsAwarded: 0,
  titles: [],
  byDifficulty: {},
};

export function challengeAwardId(uid: string, challengeId: string): string {
  return `${uid}__challenge__${challengeId}`;
}

/**
 * Every challenge that has a matchable LeetCode URL, keyed by slug.
 *
 * Fetched once per sync run and reused for every member — this is a handful
 * of documents and re-reading it per member would multiply reads by the size
 * of the club for no benefit.
 */
export async function loadMatchableChallenges(
  db: Firestore,
): Promise<Map<string, WeeklyChallengeDoc>> {
  const snap = await db.collection(COLLECTIONS.weeklyChallenges).get();
  const bySlug = new Map<string, WeeklyChallengeDoc>();

  for (const doc of snap.docs) {
    const challenge = doc.data() as WeeklyChallengeDoc;
    if (challenge.active === false) continue;
    const slug = slugFromProblemUrl(challenge.problemUrl);
    if (!slug) continue;
    // If two challenges point at the same problem, first wins. Awarding both
    // for one solve would be double-paying for a single piece of work.
    if (!bySlug.has(slug)) bySlug.set(slug, challenge);
  }

  return bySlug;
}

export async function awardMatchedChallenges(
  db: Firestore,
  uid: string,
  solves: RecentSolve[],
  challengesBySlug: Map<string, WeeklyChallengeDoc>,
  dryRun: boolean,
): Promise<ChallengeAwardResult> {
  if (solves.length === 0 || challengesBySlug.size === 0) return empty;

  const matched: { challenge: WeeklyChallengeDoc; solvedAt: number }[] = [];
  const seen = new Set<string>();
  for (const solve of solves) {
    const challenge = challengesBySlug.get(solve.slug);
    if (!challenge || seen.has(challenge.challengeId)) continue;
    seen.add(challenge.challengeId);
    matched.push({ challenge, solvedAt: solve.at });
  }

  if (matched.length === 0) return empty;

  // Skip anything already awarded. Reading first keeps the XP delta honest:
  // `set` would happily rewrite an existing doc, and we'd then increment the
  // member's XP a second time for a challenge they were already paid for.
  const refs = matched.map((m) =>
    db.collection(COLLECTIONS.pointsLog).doc(challengeAwardId(uid, m.challenge.challengeId)),
  );
  const existing = await db.getAll(...refs);
  const fresh = matched.filter((_, i) => !existing[i].exists);

  if (fresh.length === 0) return empty;

  const batch = db.batch();
  let xpAwarded = 0;
  let pointsAwarded = 0;
  const titles: string[] = [];
  const byDifficulty: Partial<Record<ProblemDifficulty, number>> = {};

  for (const { challenge, solvedAt } of fresh) {
    const docId = challengeAwardId(uid, challenge.challengeId);
    // Date the award at the actual solve when LeetCode gave us a timestamp.
    // This is the one place the engine knows when something really happened,
    // rather than when the cron noticed — so day-bucketing and streaks land on
    // the right day instead of the sync's.
    const at = solvedAt > 0 ? Timestamp.fromMillis(solvedAt * 1000) : Timestamp.now();

    const body: PointsLogDoc = {
      logId: docId,
      uid,
      challengeId: challenge.challengeId,
      problem: challenge.title,
      platform: "leetcode",
      pointsAwarded: challenge.points ?? 0,
      xpAwarded: challenge.xp ?? 0,
      awardedAt: at,
      difficulty: challenge.difficulty ?? null,
      problemSlug: slugFromProblemUrl(challenge.problemUrl),
      week: isoWeekKey(at.toDate()),
    };

    if (!dryRun) batch.set(db.collection(COLLECTIONS.pointsLog).doc(docId), body);
    xpAwarded += body.xpAwarded;
    pointsAwarded += body.pointsAwarded;
    titles.push(challenge.title);
    if (body.difficulty) {
      byDifficulty[body.difficulty] = (byDifficulty[body.difficulty] ?? 0) + 1;
    }
  }

  if (!dryRun) await batch.commit();

  return { newAwards: fresh.length, xpAwarded, pointsAwarded, titles, byDifficulty };
}
