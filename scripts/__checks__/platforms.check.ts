/**
 * Live smoke test of the platform readers. Hits the real endpoints, so it
 * needs network but no Firestore credentials.
 * Run with: npx tsx scripts/__checks__/platforms.check.ts
 */
import { fetchLeetCodeProgress } from "../lib/platforms/leetcode";
import { fetchHackerRankProgress } from "../lib/platforms/hackerrank";

console.log("=== LeetCode: real user ===");
console.log(JSON.stringify(await fetchLeetCodeProgress("neal_wu")));

console.log("=== LeetCode: nonexistent user (must yield an error, not silent zeros) ===");
console.log(JSON.stringify(await fetchLeetCodeProgress("zzz-not-a-real-user-99999")));

console.log("=== HackerRank: nonexistent user ===");
console.log(JSON.stringify(await fetchHackerRankProgress("zzz-not-a-real-user-99999")));
