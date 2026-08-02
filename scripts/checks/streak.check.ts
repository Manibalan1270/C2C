/**
 * Ad-hoc verification for the streak walker — the highest-risk pure logic in
 * the sync engine, since an off-by-one silently misreports every member's
 * streak. Run with: npx tsx scripts/__checks__/streak.check.ts
 */
import { computeStreaks } from "../sync/progression";
import { dayKey } from "../../src/lib/week";

const dayMs = 24 * 60 * 60 * 1000;
function keysAgo(...offsets: number[]) {
  return new Set(offsets.map((o) => dayKey(new Date(Date.now() - o * dayMs))));
}

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

check("empty", computeStreaks(new Set()), { currentStreak: 0, bestStreak: 0 });
check("today only", computeStreaks(keysAgo(0)), { currentStreak: 1, bestStreak: 1 });
check("yesterday only (grace period)", computeStreaks(keysAgo(1)), { currentStreak: 1, bestStreak: 1 });
check("2 days ago only (broken)", computeStreaks(keysAgo(2)), { currentStreak: 0, bestStreak: 1 });
check("today+yesterday", computeStreaks(keysAgo(0, 1)), { currentStreak: 2, bestStreak: 2 });
check("3 consecutive from today", computeStreaks(keysAgo(0, 1, 2)), { currentStreak: 3, bestStreak: 3 });
check("gap: today, then 3-5 ago", computeStreaks(keysAgo(0, 3, 4, 5)), { currentStreak: 1, bestStreak: 3 });
check("old 5-run, nothing recent", computeStreaks(keysAgo(10, 11, 12, 13, 14)), { currentStreak: 0, bestStreak: 5 });
check("yesterday-anchored 3-run", computeStreaks(keysAgo(1, 2, 3)), { currentStreak: 3, bestStreak: 3 });

console.log(fail === 0 ? `\nALL ${pass} PASS` : `\n${fail} FAILED of ${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
