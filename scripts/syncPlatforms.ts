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
  type LeaderboardSnapshotDoc,
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
import { syncMember } from "./sync/syncMember";

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


async function main() {
  const onlyUid = argValue("uid");
  console.log(
    `C2C sync — week ${isoWeekKey()}${DRY_RUN ? " (DRY RUN, no writes)" : ""}`,
  );

  const [badges, members, challengesBySlug, snapshots] = await Promise.all([
    loadBadges(),
    loadMembers(onlyUid),
    // Loaded once for the whole run — a handful of docs reused for every member.
    loadMatchableChallenges(adminDb),
    // Hoisted out of the per-member loop — identical for everyone, so fetching
    // it once per run instead of once per member removes an N+1 that scaled
    // with both club size and cron frequency.
    fetchRecentSnapshots(adminDb, 9),
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
      console.log(`  ${user.name} (${user.uid}): ${await syncMember(user, badges, challengesBySlug, snapshots, DRY_RUN)}`);
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
