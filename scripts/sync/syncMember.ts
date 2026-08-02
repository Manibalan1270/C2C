/**
 * Sync one member. The single source of truth for what a sync actually does.
 *
 * Extracted from syncPlatforms.ts so two very different callers can share it
 * without drifting:
 *   - the scheduled cron, which loops over every member
 *   - the on-demand API (api/sync.ts), which runs it for one member when they
 *     tap "Refresh my stats"
 *
 * Two implementations of "what a sync does" would eventually disagree, and the
 * disagreement would show up as a member whose numbers differ depending on
 * whether the cron or their own button updated them last. Hence one function.
 *
 * `dryRun` is a parameter rather than a module-level flag read off argv,
 * because a serverless handler has no argv worth reading.
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/adminApp";
import {
  COLLECTIONS,
  type BadgeDoc,
  type LeaderboardSnapshotDoc,
  type PlatformSolvedCounts,
  type PlatformSyncState,
  type UserDoc,
  type WeeklyChallengeDoc,
} from "../../src/types/schema";
import { isoWeekKey } from "../../src/lib/week";
import { politeDelay } from "../lib/platforms/http";
import {
  fetchLeetCodeProgress,
  fetchLeetCodeRecentSolves,
  type RecentSolve,
} from "../lib/platforms/leetcode";
import { fetchHackerRankProgress } from "../lib/platforms/hackerrank";
import { applyXpDelta, awardProgress } from "./awardSolves";
import { awardMatchedChallenges } from "./awardChallenges";
import { computeProgression } from "./progression";
import { buildStatsCache } from "./statsCache";


/**
 * Platform status derived from what this run already observed.
 *
 * Deliberately reuses the data the sync just fetched rather than calling
 * verifyPlatformHandle again. A badge on a profile page is not worth a second
 * round trip to someone else's API, and re-asking could even disagree with
 * what the sync acted on moments earlier.
 */
function statusFrom(
  linked: string | null | undefined,
  ok: boolean,
  detailsPublic: boolean,
  detail: string,
  error: string | null,
) {
  if (!linked) return null;
  return {
    verified: ok,
    detailsPublic,
    detail,
    error,
    checkedAt: Timestamp.now(),
  };
}

export async function syncMember(
  user: UserDoc,
  badges: BadgeDoc[],
  challengesBySlug: Map<string, WeeklyChallengeDoc>,
  /**
   * Recent leaderboard snapshots, fetched ONCE for the whole run.
   *
   * This used to be fetched inside this function, meaning 9 document reads per
   * member per run for data that is identical for every one of them. At a
   * 15-minute cron that is 96 runs a day: a 50-member club paid ~43,000 reads
   * a day for the same nine documents, against a 50,000/day free quota. The
   * cost of the mistake scaled with both club size and sync frequency, so it
   * would have surfaced as an outage right when the club got popular.
   */
  snapshots: LeaderboardSnapshotDoc[],
  dryRun: boolean,
): Promise<string> {
  const errors: string[] = [];
  const notes: string[] = [];
  const previous: PlatformSyncState = user.syncState ?? {};
  const nextState: PlatformSyncState = { ...previous };

  let leetcodeCounts: PlatformSolvedCounts | null = null;
  const plan: Parameters<typeof awardProgress>[2] = {};

  // Per-problem feed, for matching solves to weekly challenges. Defaults to
  // "public" so a member with no LeetCode handle is never nagged about a
  // privacy setting on an account they haven't linked.
  let recentSolves: RecentSolve[] = [];
  let historyPublic = true;
  let leetcodeOk = false;
  let leetcodeDetail = "";
  let leetcodeError: string | null = null;
  let hackerrankOk = false;
  let hackerrankDetail = "";
  let hackerrankError: string | null = null;

  if (user.leetcodeUsername) {
    const result = await fetchLeetCodeProgress(user.leetcodeUsername);
    if (result.error) { errors.push(result.error); leetcodeError = result.error; }
    if (result.counts) {
      leetcodeOk = true;
      leetcodeDetail = `${result.counts.easy + result.counts.medium + result.counts.hard} solved`;
      leetcodeCounts = result.counts;
      nextState.leetcode = result.counts;
      const total = result.counts.easy + result.counts.medium + result.counts.hard;

      if (previous.leetcode) {
        plan.leetcode = { previous: previous.leetcode, current: result.counts };
      } else {
        notes.push(`baselined LeetCode at ${total} solves (no XP for pre-existing work)`);
      }

      // Which problems, not just how many. Runs even on the baseline pass:
      // challenge awards are matched per problem and de-duplicated by doc id,
      // so there's no backfill risk — a member who links their account after
      // solving this week's challenge still gets credited for it, which is the
      // behaviour people expect and the count-based baseline can't give them.
      const recent = await fetchLeetCodeRecentSolves(user.leetcodeUsername, total);
      if (recent.error) errors.push(recent.error);
      historyPublic = recent.historyPublic;
      recentSolves = recent.solves;
    }
    await politeDelay();
  }

  if (user.hackerrankUsername) {
    const result = await fetchHackerRankProgress(user.hackerrankUsername);
    if (result.error) { errors.push(result.error); hackerrankError = result.error; }
    if (result.badgeCount != null) {
      hackerrankOk = true;
      hackerrankDetail = result.badgeCount === 1 ? "1 badge" : `${result.badgeCount} badges`;
      nextState.hackerrankBadges = result.badgeCount;
      if (previous.hackerrankBadges != null) {
        plan.hackerrank = {
          previous: previous.hackerrankBadges,
          current: result.badgeCount,
        };
      } else {
        notes.push(`baselined HackerRank at ${result.badgeCount} badges`);
      }
    }
    await politeDelay();
  }

  // Challenge matching runs FIRST, and the order matters. It reports which
  // difficulties it credited, and awardProgress uses that to skip the generic
  // award for the very same solve — otherwise one problem is paid twice and
  // counted twice everywhere the UI counts award rows.
  const challengeAward = await awardMatchedChallenges(
    adminDb,
    user.uid,
    recentSolves,
    challengesBySlug,
    dryRun,
  );
  await applyXpDelta(adminDb, user.uid, challengeAward.xpAwarded, dryRun);
  if (challengeAward.newAwards > 0) {
    notes.push(`completed: ${challengeAward.titles.join(", ")}`);
  }

  const award = await awardProgress(
    adminDb,
    user.uid,
    plan,
    dryRun,
    challengeAward.byDifficulty,
  );
  await applyXpDelta(adminDb, user.uid, award.xpAwarded, dryRun);
  if (award.capped) {
    notes.push("award count hit the per-run cap — the rest will follow next run");
  }
  if (!historyPublic) {
    notes.push("submission history is private — challenges can't be auto-completed");
  }

  /**
   * Skip the expensive recompute when nothing about this member changed.
   *
   * computeProgression and buildStatsCache each scan a member's recent
   * pointsLog — roughly 25 document reads per member per run. Most members, on
   * most runs, have solved nothing since the last one, so that is pure waste,
   * and at a 15-minute cron it is the difference between a club of 15 and a
   * club of 200 fitting inside Firestore's free tier.
   *
   * The daily condition is what keeps this honest rather than merely cheap.
   * Streaks DECAY with the calendar, not with new data: someone who stops
   * solving must see their streak fall even though nothing new was written.
   * Recomputing at least once per day preserves that, while still skipping the
   * other ~95 runs where the answer provably cannot have changed.
   */
  const cache = user.stats;
  const today = new Date().toISOString().slice(0, 10);
  const cacheDay = cache?.computedAt?.toDate?.().toISOString().slice(0, 10);
  const nothingChanged =
    award.newAwards === 0 &&
    challengeAward.newAwards === 0 &&
    cache != null &&
    cache.week === isoWeekKey() &&
    cacheDay === today;

  if (nothingChanged) {
    if (!dryRun) {
      await adminDb.collection(COLLECTIONS.users).doc(user.uid).update({
        syncState: nextState,
        lastSyncedAt: FieldValue.serverTimestamp(),
        lastSyncError: errors.length > 0 ? errors.join(" · ") : null,
        leetcodeHistoryPublic: user.leetcodeUsername ? historyPublic : null,
        platformStatus: {
          ...(statusFrom(user.leetcodeUsername, leetcodeOk, historyPublic, leetcodeDetail, leetcodeError)
            ? { leetcode: statusFrom(user.leetcodeUsername, leetcodeOk, historyPublic, leetcodeDetail, leetcodeError) }
            : {}),
          ...(statusFrom(user.hackerrankUsername, hackerrankOk, hackerrankOk, hackerrankDetail, hackerrankError)
            ? { hackerrank: statusFrom(user.hackerrankUsername, hackerrankOk, hackerrankOk, hackerrankDetail, hackerrankError) }
            : {}),
        },
      });
    }
    const idle = ["no change"];
    if (errors.length > 0) idle.push(`ERRORS: ${errors.join(" · ")}`);
    return idle.join(" · ");
  }

  const newXp = (user.xp ?? 0) + award.xpAwarded + challengeAward.xpAwarded;
  const progression = await computeProgression(
    adminDb,
    user,
    badges,
    newXp,
    leetcodeCounts,
  );

  const stats = await buildStatsCache(
    adminDb,
    user.uid,
    snapshots,
    progression.solvedByDifficulty,
    progression.totalSolved,
  );

  if (!dryRun) {
    await adminDb
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .update({
        level: progression.level,
        currentStreak: progression.currentStreak,
        bestStreak: progression.bestStreak,
        stats,
        syncState: nextState,
        lastSyncedAt: FieldValue.serverTimestamp(),
        lastSyncError: errors.length > 0 ? errors.join(" · ") : null,
        // Only meaningful for members who actually linked LeetCode; null
        // otherwise so the Profile page can tell "not applicable" apart from
        // "we checked and it's private".
        leetcodeHistoryPublic: user.leetcodeUsername ? historyPublic : null,
        platformStatus: {
          ...(statusFrom(user.leetcodeUsername, leetcodeOk, historyPublic, leetcodeDetail, leetcodeError)
            ? { leetcode: statusFrom(user.leetcodeUsername, leetcodeOk, historyPublic, leetcodeDetail, leetcodeError) }
            : {}),
          ...(statusFrom(user.hackerrankUsername, hackerrankOk, hackerrankOk, hackerrankDetail, hackerrankError)
            ? { hackerrank: statusFrom(user.hackerrankUsername, hackerrankOk, hackerrankOk, hackerrankDetail, hackerrankError) }
            : {}),
        },
        ...(progression.newBadgeIds.length > 0
          ? { badgeIds: FieldValue.arrayUnion(...progression.newBadgeIds) }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  // XP from both award paths. Reporting only the count-based figure was
  // actively misleading: a member whose entire run was challenge completions
  // saw "+0 XP" in the log next to a "completed: ..." note, which reads as a
  // bug in the thing that had just worked.
  const totalXpAwarded = award.xpAwarded + challengeAward.xpAwarded;
  const parts = [
    `+${award.newAwards} solves`,
    `+${challengeAward.newAwards} challenges`,
    `+${totalXpAwarded} XP`,
    `L${progression.level}`,
    `streak ${progression.currentStreak}`,
  ];
  if (progression.newBadgeIds.length > 0) {
    parts.push(`badges: ${progression.newBadgeIds.join(",")}`);
  }
  parts.push(...notes);
  if (errors.length > 0) parts.push(`ERRORS: ${errors.join(" · ")}`);
  return parts.join(" · ");
}
