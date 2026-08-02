/**
 * Checks the challenge-matching path end to end, without Firestore.
 *
 * The two things that can silently break auto-completion are slug extraction
 * (an admin pastes a URL shape we don't parse) and the live feed changing
 * shape. Both are covered here. Run with:
 *   npx tsx scripts/__checks__/challengeMatch.check.ts
 */
import { slugFromProblemUrl, isMatchable } from "../../src/lib/problemSlug";
import { fetchLeetCodeProgress, fetchLeetCodeRecentSolves } from "../lib/platforms/leetcode";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

console.log("=== slug extraction: shapes admins actually paste ===");
check("trailing slash", slugFromProblemUrl("https://leetcode.com/problems/two-sum/"), "two-sum");
check("no trailing slash", slugFromProblemUrl("https://leetcode.com/problems/two-sum"), "two-sum");
check("/description/ suffix", slugFromProblemUrl("https://leetcode.com/problems/two-sum/description/"), "two-sum");
check("query string", slugFromProblemUrl("https://leetcode.com/problems/two-sum/?envType=daily-question"), "two-sum");
check("no scheme", slugFromProblemUrl("leetcode.com/problems/two-sum/"), "two-sum");
check("leetcode.cn mirror", slugFromProblemUrl("https://leetcode.cn/problems/two-sum/"), "two-sum");
check("hyphenated slug", slugFromProblemUrl("https://leetcode.com/problems/course-schedule-ii/"), "course-schedule-ii");
check("uppercase normalised", slugFromProblemUrl("https://leetcode.com/Problems/Two-Sum/"), "two-sum");
check("null in, null out", slugFromProblemUrl(null), null);
check("non-problem url", slugFromProblemUrl("https://leetcode.com/contest/weekly-123/"), null);
check("hackerrank url", slugFromProblemUrl("https://hackerrank.com/challenges/foo"), null);
check("isMatchable true", isMatchable("https://leetcode.com/problems/two-sum/"), true);
check("isMatchable false", isMatchable(null), false);

console.log("\n=== live feed: is per-problem history still readable? ===");

async function main() {
  // A known-public account. If this ever returns 0, either LeetCode changed
  // the endpoint or this account went private — check a second one before
  // concluding the feature is dead.
  const progress = await fetchLeetCodeProgress("lee215");
  const total = progress.counts
    ? progress.counts.easy + progress.counts.medium + progress.counts.hard
    : 0;
  const recent = await fetchLeetCodeRecentSolves("lee215", total);
  console.log(
    `public account:  ${recent.solves.length} slugs, historyPublic=${recent.historyPublic}` +
      (recent.solves[0] ? ` (e.g. ${recent.solves[0].slug})` : ""),
  );
  if (recent.solves.length === 0) {
    failures += 1;
    console.log("FAIL  expected a public account to expose recent solves");
  }

  // An account with solves but history switched off must be reported as
  // private rather than as "no solves" — that distinction is what drives the
  // prompt on the Profile page.
  const p2 = await fetchLeetCodeProgress("neal_wu");
  const t2 = p2.counts ? p2.counts.easy + p2.counts.medium + p2.counts.hard : 0;
  const r2 = await fetchLeetCodeRecentSolves("neal_wu", t2);
  console.log(`private account: ${r2.solves.length} slugs, historyPublic=${r2.historyPublic} (lifetime ${t2})`);
  if (t2 > 0 && r2.historyPublic) {
    failures += 1;
    console.log("FAIL  an account with solves but an empty feed must report historyPublic=false");
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
