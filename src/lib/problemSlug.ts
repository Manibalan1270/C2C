/**
 * Extracting a LeetCode problem slug from the URL an admin pasted.
 *
 * Lives in src/ rather than scripts/ because both sides need the exact same
 * answer: the sync engine matches solved slugs against challenges, and the
 * members UI decides whether a challenge is even matchable. Two
 * implementations would drift, and the failure would be silent — a challenge
 * that never completes for anyone, with nothing in the logs.
 *
 * Deliberately permissive about the shapes admins actually paste:
 *   https://leetcode.com/problems/two-sum/
 *   https://leetcode.com/problems/two-sum/description/
 *   https://leetcode.com/problems/two-sum/?envType=daily-question
 *   leetcode.com/problems/two-sum
 *   https://leetcode.cn/problems/two-sum/
 */

const PROBLEM_PATH = /\/problems\/([a-z0-9-]+)/i;

/** The slug, or null when the URL isn't a LeetCode problem link. */
export function slugFromProblemUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = PROBLEM_PATH.exec(url);
  if (!match) return null;
  return match[1].toLowerCase();
}

/**
 * Whether a challenge can ever be auto-completed.
 *
 * A challenge with no problem URL — or one pointing somewhere other than a
 * LeetCode problem — has nothing for the sync engine to match against. The UI
 * uses this to avoid promising a completion tick it can't deliver.
 */
export function isMatchable(problemUrl: string | null | undefined): boolean {
  return slugFromProblemUrl(problemUrl) !== null;
}
