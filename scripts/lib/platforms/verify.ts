/**
 * "Is this handle real, and can we read what we need from it?"
 *
 * One implementation shared by the on-demand verify endpoint and the sync
 * engine, so the badge a member sees on their Profile can never disagree with
 * what the engine actually managed to read. Two implementations would drift,
 * and the symptom would be a green "Verified" tick next to a sync that has
 * been failing for a week.
 *
 * Returns a plain object rather than throwing: a handle that doesn't exist is
 * an expected answer, not an exceptional one.
 */
import { fetchLeetCodeProgress, fetchLeetCodeRecentSolves } from "./leetcode";
import { fetchHackerRankProgress } from "./hackerrank";
import type { CodingPlatform } from "../../../src/types/schema";

export interface VerifyResult {
  verified: boolean;
  detailsPublic: boolean;
  detail: string;
  error: string | null;
}

async function verifyLeetCode(username: string): Promise<VerifyResult> {
  const progress = await fetchLeetCodeProgress(username);

  if (progress.error || !progress.counts) {
    return {
      verified: false,
      detailsPublic: false,
      detail: "",
      // The platform's own wording is better than anything we'd invent —
      // "That user does not exist." tells the member exactly what to fix.
      error: progress.error ?? `Couldn't read the LeetCode profile for "${username}".`,
    };
  }

  const { easy, medium, hard } = progress.counts;
  const total = easy + medium + hard;

  // Second, independent question: can we see WHICH problems, not just how
  // many. Only meaningful once we know the account is real.
  const recent = await fetchLeetCodeRecentSolves(username, total);

  return {
    verified: true,
    detailsPublic: recent.historyPublic,
    detail: `${total} solved · ${easy}E ${medium}M ${hard}H`,
    error: null,
  };
}

async function verifyHackerRank(username: string): Promise<VerifyResult> {
  const progress = await fetchHackerRankProgress(username);

  if (progress.error || progress.badgeCount == null) {
    return {
      verified: false,
      detailsPublic: false,
      detail: "",
      error: progress.error ?? `Couldn't read the HackerRank profile for "${username}".`,
    };
  }

  // A real account with zero badges is verified — `tourist` is a live example.
  // Treating 0 as "not found" would reject legitimate new accounts, which is
  // exactly who is most likely to be linking one for the first time.
  return {
    verified: true,
    // HackerRank exposes no per-submission history at all, so there is no
    // second toggle for a member to turn on. Readable profile IS the whole
    // capability, and claiming otherwise would send them looking for a
    // setting that does not exist.
    detailsPublic: true,
    detail: progress.badgeCount === 1 ? "1 badge" : `${progress.badgeCount} badges`,
    error: null,
  };
}

export async function verifyPlatformHandle(
  platform: CodingPlatform,
  username: string,
): Promise<VerifyResult> {
  const handle = username.trim();
  if (!handle) {
    return { verified: false, detailsPublic: false, detail: "", error: "No username given." };
  }
  return platform === "leetcode"
    ? verifyLeetCode(handle)
    : verifyHackerRank(handle);
}
