/**
 * Verifies the award engine's idempotency contract without touching
 * Firestore: a fake batch/db records what *would* be written.
 * Run with: npx tsx scripts/__checks__/award.check.ts
 */
import { awardProgress, leetcodeAwardId } from "../sync/awardSolves";

const written: string[] = [];
const fakeDb = {
  batch: () => ({
    set: (ref: { id: string }) => written.push(ref.id),
    commit: async () => undefined,
  }),
  collection: () => ({ doc: (id: string) => ({ id }) }),
} as never;

let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

const zero = { easy: 0, medium: 0, hard: 0 };

// 1. No change -> no writes, no XP.
written.length = 0;
let r = await awardProgress(fakeDb, "u1", { leetcode: { previous: { easy: 5, medium: 2, hard: 1 }, current: { easy: 5, medium: 2, hard: 1 } } }, false);
check("no change: awards", r.newAwards, 0);
check("no change: xp", r.xpAwarded, 0);
check("no change: writes", written.length, 0);

// 2. +2 easy -> exactly ids easy-6, easy-7 (the idempotency property).
written.length = 0;
r = await awardProgress(fakeDb, "u1", { leetcode: { previous: { easy: 5, medium: 0, hard: 0 }, current: { easy: 7, medium: 0, hard: 0 } } }, false);
check("+2 easy: awards", r.newAwards, 2);
check("+2 easy: xp (20 each)", r.xpAwarded, 40);
check("+2 easy: exact ids", written, [leetcodeAwardId("u1","easy",6), leetcodeAwardId("u1","easy",7)]);

// 3. Mixed difficulties price correctly: 1 easy(20) + 1 med(45) + 1 hard(90) = 155
written.length = 0;
r = await awardProgress(fakeDb, "u1", { leetcode: { previous: zero, current: { easy: 1, medium: 1, hard: 1 } } }, false);
check("mixed: xp", r.xpAwarded, 155);
check("mixed: points", r.pointsAwarded, 85);

// 4. Re-running the SAME delta writes the same ids (so set() overwrites, never duplicates).
written.length = 0;
await awardProgress(fakeDb, "u1", { leetcode: { previous: { easy: 5, medium: 0, hard: 0 }, current: { easy: 7, medium: 0, hard: 0 } } }, false);
const first = [...written];
written.length = 0;
await awardProgress(fakeDb, "u1", { leetcode: { previous: { easy: 5, medium: 0, hard: 0 }, current: { easy: 7, medium: 0, hard: 0 } } }, false);
check("re-run: identical ids", written, first);

// 5. dry-run writes nothing but still reports.
written.length = 0;
r = await awardProgress(fakeDb, "u1", { leetcode: { previous: zero, current: { easy: 3, medium: 0, hard: 0 } } }, true);
check("dry-run: reports awards", r.newAwards, 3);
check("dry-run: no writes", written.length, 0);

// 6. Cap engages on an absurd delta.
written.length = 0;
r = await awardProgress(fakeDb, "u1", { leetcode: { previous: zero, current: { easy: 5000, medium: 0, hard: 0 } } }, false);
check("cap: capped flag", r.capped, true);
check("cap: bounded writes", written.length, 100);

// 7. HackerRank badges.
written.length = 0;
r = await awardProgress(fakeDb, "u1", { hackerrank: { previous: 2, current: 4 } }, false);
check("hackerrank: awards", r.newAwards, 2);
check("hackerrank: ids", written, ["u1__hackerrank__badge-3", "u1__hackerrank__badge-4"]);

// 8. A count going DOWN (platform glitch / account reset) must not award or crash.
written.length = 0;
r = await awardProgress(fakeDb, "u1", { leetcode: { previous: { easy: 10, medium: 0, hard: 0 }, current: { easy: 4, medium: 0, hard: 0 } } }, false);
check("count decreased: no awards", r.newAwards, 0);
check("count decreased: no xp", r.xpAwarded, 0);

console.log(fail === 0 ? `\nALL ${pass} PASS` : `\n${fail} FAILED of ${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
