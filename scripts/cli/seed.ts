/**
 * Idempotent seed entry point — deterministic doc ids + `set()`, so
 * re-running converges rather than duplicating.
 *
 * Usage:
 *   npm run seed                    seeds badges, challenges + public site content
 *   npm run seed:demo -- --uid=abc  also seeds 40 synthetic pointsLog docs
 *                                    for that uid (dev-only demo data)
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../lib/adminApp";
import { COLLECTIONS } from "../../src/types/schema";
import { BADGE_SEEDS } from "../seed/badges";
import { currentWeekChallengeSeeds } from "../seed/challenges";
import { demoPointsLogSeeds } from "../seed/demoPointsLog";
import { BLOG_POST_SEEDS, BOARD_MEMBER_SEEDS, SITE_EVENT_SEEDS } from "../seed/site";
import { DEFAULT_WEEKLY_GOAL } from "../../src/lib/gamification";

const SEED_ACTOR = "seed-script";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function seedBadges() {
  const batch = adminDb.batch();
  for (const badge of BADGE_SEEDS) {
    const ref = adminDb.collection(COLLECTIONS.badges).doc(badge.badgeId);
    batch.set(ref, badge, { merge: true });
  }
  await batch.commit();
  console.log(`  badges: ${BADGE_SEEDS.length} seeded`);
}

async function seedChallengesAndGoal() {
  const { week, challenges } = currentWeekChallengeSeeds();
  const batch = adminDb.batch();

  for (const challenge of challenges) {
    // Deterministic id so re-running updates rather than duplicating.
    const challengeId = `${week}__${challenge.tier}`;
    const ref = adminDb.collection(COLLECTIONS.weeklyChallenges).doc(challengeId);
    batch.set(
      ref,
      {
        challengeId,
        week,
        ...challenge,
        createdBy: SEED_ACTOR,
        createdAt: FieldValue.serverTimestamp(),
        active: true,
      },
      { merge: true },
    );
  }

  const goalRef = adminDb.collection(COLLECTIONS.weeklyGoals).doc(week);
  batch.set(
    goalRef,
    {
      week,
      label: DEFAULT_WEEKLY_GOAL.label,
      target: DEFAULT_WEEKLY_GOAL.target,
      createdBy: SEED_ACTOR,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  console.log(`  weeklyChallenges: ${challenges.length} seeded for ${week}`);
  console.log(`  weeklyGoals: goal seeded for ${week}`);
}

/**
 * Public-site content.
 *
 * Most of it lands unpublished on purpose — see the note in seed/site.ts. The
 * seeds exist so the admin screens open with real rows to edit rather than an
 * empty state, not so the homepage fills itself with fiction.
 */
async function seedSiteContent() {
  const batch = adminDb.batch();

  for (const event of SITE_EVENT_SEEDS) {
    const { seedId, ...body } = event;
    const ref = adminDb.collection(COLLECTIONS.siteEvents).doc(seedId);
    batch.set(
      ref,
      {
        eventId: seedId,
        ...body,
        imageUrl: null,
        createdBy: SEED_ACTOR,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  for (const member of BOARD_MEMBER_SEEDS) {
    const { seedId, ...body } = member;
    const ref = adminDb.collection(COLLECTIONS.boardMembers).doc(seedId);
    batch.set(
      ref,
      {
        memberId: seedId,
        ...body,
        imageUrl: null,
        linkUrl: null,
        createdBy: SEED_ACTOR,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  for (const post of BLOG_POST_SEEDS) {
    const { seedId, ...body } = post;
    const ref = adminDb.collection(COLLECTIONS.blogPosts).doc(seedId);
    batch.set(
      ref,
      {
        postId: seedId,
        ...body,
        author: SEED_ACTOR,
        authorName: "C2C",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
  console.log(`  siteEvents: ${SITE_EVENT_SEEDS.length} seeded`);
  console.log(`  boardMembers: ${BOARD_MEMBER_SEEDS.length} seeded`);
  console.log(`  blogPosts: ${BLOG_POST_SEEDS.length} seeded`);
  console.log("  (most are unpublished — publish them once you've filled them in)");
}

async function seedDemoPointsLog(uid: string) {
  const logs = demoPointsLogSeeds(uid);
  const batch = adminDb.batch();
  for (const log of logs) {
    const { docId, ...body } = log;
    const ref = adminDb.collection(COLLECTIONS.pointsLog).doc(docId);
    batch.set(ref, body, { merge: true });
  }
  await batch.commit();
  console.log(`  pointsLog (demo): ${logs.length} seeded for uid=${uid}`);
}

async function main() {
  console.log("Seeding Firestore...");
  await seedBadges();
  await seedChallengesAndGoal();
  await seedSiteContent();

  const isDemo = process.argv.includes("--demo");
  const uid = argValue("uid");
  if (isDemo) {
    if (!uid) {
      throw new Error("--demo requires --uid=<uid>. Find your uid in the Firebase console under Authentication.");
    }
    await seedDemoPointsLog(uid);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
