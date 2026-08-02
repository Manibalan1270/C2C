/**
 * HackerRank reader — best-effort, and materially weaker than the LeetCode
 * one. Read this before relying on it.
 *
 * HackerRank exposes no per-submission history to logged-out visitors. What
 * IS public is a member's earned badges, so that's what the engine counts.
 * Consequences:
 *   - No difficulty, so awards use the flat AWARD_UNKNOWN rate.
 *   - No timestamps, so awards are dated at sync time.
 *   - The endpoint is a private REST route behind their SPA. It can change
 *     or start requiring auth with no notice; when it does this returns an
 *     error string and the rest of the sync carries on unaffected.
 *
 * If HackerRank stops working entirely, LeetCode still covers the majority
 * of what the club actually uses.
 */
import { fetchJson } from "./http";

interface BadgesResponse {
  models?: { badge_name?: string }[] | null;
}

export interface HackerRankProgress {
  badgeCount: number | null;
  error: string | null;
}

export async function fetchHackerRankProgress(
  username: string,
): Promise<HackerRankProgress> {
  const res = await fetchJson<BadgesResponse>(
    `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`,
  );

  if (!res.ok) {
    if (res.status === 404) {
      return {
        badgeCount: null,
        error: `HackerRank: no public profile found for "${username}" — check the username.`,
      };
    }
    return { badgeCount: null, error: `HackerRank: ${res.message}` };
  }

  const models = res.data.models;
  if (models == null) {
    return {
      badgeCount: null,
      error: `HackerRank: couldn't read badges for "${username}" — the profile may be private.`,
    };
  }

  return {
    badgeCount: models.filter((m) => m?.badge_name).length,
    error: null,
  };
}
