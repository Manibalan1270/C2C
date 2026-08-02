/**
 * The sync engine. Reads every member's linked LeetCode/HackerRank profile,
 * awards XP for anything new, recomputes streaks/levels/badges, refreshes
 * the leaderboard snapshot, and caches dashboard stats.
 *
 * Runs on a schedule from GitHub Actions (.github/workflows/sync.yml) using
 * the Admin SDK, which bypasses Firestore rules — that's what makes it safe
 * for members to be read-only on their own xp/level/streaks.
 *
 * Usage:
 *   npm run sync                    live run
 *   npm run sync -- --dry-run       read and report, write nothing
 *   npm run sync -- --uid=abc123    one member only (debugging)
 *
 * Two behaviours worth understanding before changing anything:
 *
 * 1. FIRST LINK ESTABLISHES A BASELINE, IT DOESN'T BACKFILL. A member who
 *    links an account with 250 existing solves gets no XP for them — those
 *    were solved before they joined, and awarding them would both distort
 *    the leaderboard and dump 250 same-dated entries into the activity
 *    chart. The first run records their counts; awards start from the next
 *    one.
 *
 * 2. EVERY AWARD IS IDEMPOTENT via a deterministic doc id, so a re-run, an
 *    overlapping run, or a retry after a crash converges instead of
 *    double-awarding. One member failing never aborts the run — their error
 *    lands on their own profile (`lastSyncError`) and the loop continues.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/adminApp";
import {
  COLLECTIONS,
  type BadgeDoc,
  type PlatformSolvedCounts,
  type PlatformSyncState,
  type UserDoc,
  type WeeklyChallengeDoc,
} from "../src/types/schema";
import { isoWeekKey } from "../src/lib/week";
import { politeDelay } from "./lib/platforms/http";
import {
  fetchLeetCodeProgress,
  fetchLeetCodeRecentSolves,
  type RecentSolve,
} from "./lib/platforms/leetcode";
import { fetchHackerRankProgress } from "./lib/platforms/hackerrank";
import { applyXpDelta, awardProgress } from "./sync/awardSolves";
import { awardMatchedChallenges, loadMatchableChallenges } from "./sync/awardChallenges";
import { computeProgression } from "./sync/progression";
import { buildStatsCache } from "./sync/statsCache";
import { fetchRecentSnapshots, writeWeeklySnapshot } from "./sync/snapshot";

const DRY_RUN = process.argv.includes("--dry-run");

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function loadBadges(): Promise<BadgeDoc[]> {
  const snap = await adminDb.collection(COLLECTIONS.badges).get();
  return snap.docs.map((d) => d.data() as BadgeDoc);
}

async function loadMembers(onlyUid?: string): Promise<UserDoc[]> {
  if (onlyUid) {
    const doc = await adminDb.collection(COLLECTIONS.users).doc(onlyUid).get();
    return doc.exists ? [doc.data() as UserDoc] : [];
  }
  const snap = await adminDb.collection(COLLECTIONS.users).get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

async function syncMember(
  user: UserDoc,
  badges: BadgeDoc[],
  challengesBySlug: Map<string, WeeklyChallengeDoc>,
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

  if (user.leetcodeUsername) {
    const result = await fetchLeetCodeProgress(user.leetcodeUsername);
    if (result.error) errors.push(result.error);
    if (result.counts) {
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
    if (result.error) errors.push(result.error);
    if (result.badgeCount != null) {
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

  const award = await awardProgress(adminDb, user.uid, plan, DRY_RUN);
  await applyXpDelta(adminDb, user.uid, award.xpAwarded, DRY_RUN);
  if (award.capped) {
    notes.push("award count hit the per-run cap — the rest will follow next run");
  }

  // Challenge matching. Its XP is applied separately from the count-based
  // award above but folded into the same running total, so level and badge
  // thresholds see the combined figure rather than a stale one.
  const challengeAward = await awardMatchedChallenges(
    adminDb,
    user.uid,
    recentSolves,
    challengesBySlug,
    DRY_RUN,
  );
  await applyXpDelta(adminDb, user.uid, challengeAward.xpAwarded, DRY_RUN);
  if (challengeAward.newAwards > 0) {
    notes.push(`completed: ${challengeAward.titles.join(", ")}`);
  }
  if (!historyPublic) {
    notes.push("submission history is private — challenges can't be auto-completed");
  }

  const newXp = (user.xp ?? 0) + award.xpAwarded + challengeAward.xpAwarded;
  const progression = await computeProgression(
    adminDb,
    user,
    badges,
    newXp,
    leetcodeCounts,
  );

  const snapshots = await fetchRecentSnapshots(adminDb, 9);
  const stats = await buildStatsCache(
    adminDb,
    user.uid,
    snapshots,
    progression.solvedByDifficulty,
    progression.totalSolved,
  );

  if (!DRY_RUN) {
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
        ...(progression.newBadgeIds.length > 0
          ? { badgeIds: FieldValue.arrayUnion(...progression.newBadgeIds) }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  const parts = [
    `+${award.newAwards} solves`,
    `+${award.xpAwarded} XP`,
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

async function main() {
  const onlyUid = argValue("uid");
  console.log(
    `C2C sync — week ${isoWeekKey()}${DRY_RUN ? " (DRY RUN, no writes)" : ""}`,
  );

  const [badges, members, challengesBySlug] = await Promise.all([
    loadBadges(),
    loadMembers(onlyUid),
    // Loaded once for the whole run — a handful of docs reused for every member.
    loadMatchableChallenges(adminDb),
  ]);

  const linked = members.filter(
    (m) => m.leetcodeUsername != null || m.hackerrankUsername != null,
  );
  console.log(
    `${members.length} members, ${linked.length} with a linked account, ` +
      `${badges.length} badge definitions, ${challengesBySlug.size} matchable challenges`,
  );

  let failures = 0;
  for (const user of linked) {
    try {
      console.log(`  ${user.name} (${user.uid}): ${await syncMember(user, badges, challengesBySlug)}`);
    } catch (err: unknown) {
      // One member's failure must not take the run down — record it on
      // their profile and keep going.
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ${user.name} (${user.uid}): FAILED — ${message}`);
      if (!DRY_RUN) {
        await adminDb
          .collection(COLLECTIONS.users)
          .doc(user.uid)
          .update({ lastSyncError: `Sync failed: ${message}` })
          .catch(() => undefined);
      }
    }
  }

  const snapshot = await writeWeeklySnapshot(adminDb, DRY_RUN);
  console.log(`Snapshot ${snapshot.week}: ${snapshot.rankings.length} ranked members`);

  // A per-member failure is expected operationally (someone renames their
  // LeetCode account), so it's reported but doesn't fail the workflow. Only
  // an error thrown out of main() does.
  console.log(
    failures === 0 ? "Done." : `Done with ${failures} member failure(s) — see above.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
