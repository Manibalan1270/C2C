/**
 * LeetCode reader, via their public (but undocumented) GraphQL endpoint.
 *
 * Two things are read here, and they have very different reliability:
 *
 * 1. Lifetime solved counts (`matchedUser`) — always available for any public
 *    profile. This is what the XP engine diffs, and it works for everyone.
 *
 * 2. Recent accepted submissions (`recentAcSubmissionList`) — available only
 *    for members who have made their submission history public. This is what
 *    lets a solve be matched to a specific weekly challenge.
 *
 * A previous version of this file asserted that (2) was auth-gated and
 * impossible logged-out. That was wrong, and the mistake is worth recording:
 * the endpoint was tested against a single account that happened to have
 * submission history switched off, and an empty array was read as a hard
 * block. It isn't — it's a per-account privacy setting. Verified live:
 * `neal_wu` returns 0 items while `lee215` and `votrubac` return real problem
 * slugs on the same query, same headers, no auth.
 *
 * The list is capped at 20 entries no matter what `limit` is passed; asking
 * for 500 still returns 20. For an extremely active solver that's roughly
 * four weeks of history, and for a typical club member it's many months, so a
 * six-hourly sync has an enormous margin. Anyone solving more than 20 problems
 * between two runs would lose the overflow for challenge-matching purposes —
 * their XP is unaffected, because that comes from the counts in (1).
 *
 * `matchedUser` also doubles as the existence check: an unknown handle comes
 * back as a GraphQL error ("That user does not exist.") rather than an empty
 * result, which is the only reliable way to tell a typo'd username apart
 * from a member who simply hasn't solved anything.
 */
import type { PlatformSolvedCounts } from "../../../src/types/schema";
import { fetchJson } from "./http";

const ENDPOINT = "https://leetcode.com/graphql";

const PROGRESS_QUERY = `
  query userProgress($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

interface ProgressResponse {
  data?: {
    matchedUser?: {
      username: string;
      submitStatsGlobal?: {
        acSubmissionNum?: { difficulty: string; count: number }[] | null;
      } | null;
    } | null;
  };
  errors?: { message: string }[];
}

export interface LeetCodeProgress {
  counts: PlatformSolvedCounts | null;
  error: string | null;
}

export async function fetchLeetCodeProgress(
  username: string,
): Promise<LeetCodeProgress> {
  const res = await fetchJson<ProgressResponse>(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LeetCode rejects GraphQL POSTs without a plausible Referer.
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({ query: PROGRESS_QUERY, variables: { username } }),
  });

  if (!res.ok) return { counts: null, error: `LeetCode: ${res.message}` };

  if (res.data.errors?.length) {
    // "That user does not exist." lands here — surfaced verbatim because the
    // fix belongs to the member (correct the handle on their profile).
    return { counts: null, error: `LeetCode: ${res.data.errors[0].message}` };
  }

  const rows = res.data.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
  if (!rows) {
    return {
      counts: null,
      error: `LeetCode: couldn't read stats for "${username}" — the profile may be private.`,
    };
  }

  const counts: PlatformSolvedCounts = { easy: 0, medium: 0, hard: 0 };
  for (const row of rows) {
    // The API returns an "All" row alongside the three difficulties; skip it.
    switch (row?.difficulty?.toLowerCase()) {
      case "easy":
        counts.easy = row.count ?? 0;
        break;
      case "medium":
        counts.medium = row.count ?? 0;
        break;
      case "hard":
        counts.hard = row.count ?? 0;
        break;
    }
  }

  return { counts, error: null };
}

// ---------------------------------------------------------------------------
// Recent accepted submissions — the per-problem feed
// ---------------------------------------------------------------------------

/** LeetCode caps this server-side; asking for more is silently truncated. */
export const RECENT_SOLVES_CAP = 20;

const RECENT_AC_QUERY = `
  query recentAc($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
      timestamp
    }
  }
`;

interface RecentAcResponse {
  data?: {
    recentAcSubmissionList?: { titleSlug: string; timestamp: string }[] | null;
  };
  errors?: { message: string }[];
}

export interface RecentSolve {
  slug: string;
  /** Epoch seconds, as LeetCode reports it. */
  at: number;
}

export interface LeetCodeRecentSolves {
  solves: RecentSolve[];
  /**
   * False when the feed came back empty for someone who demonstrably has
   * solves — i.e. their submission history is private.
   *
   * This distinction is the whole reason the caller passes `knownSolveTotal`
   * in: an empty list is ambiguous on its own, and telling a member "make your
   * history public" when they simply haven't solved anything yet would be
   * wrong and confusing. Only report it when we can prove the feed is lying.
   */
  historyPublic: boolean;
  error: string | null;
}

/**
 * Recent accepted problem slugs for a member.
 *
 * `knownSolveTotal` is their lifetime solve count from `fetchLeetCodeProgress`.
 * It's used solely to tell "private history" apart from "no solves yet".
 */
export async function fetchLeetCodeRecentSolves(
  username: string,
  knownSolveTotal: number,
): Promise<LeetCodeRecentSolves> {
  const res = await fetchJson<RecentAcResponse>(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/",
      Origin: "https://leetcode.com",
    },
    body: JSON.stringify({
      query: RECENT_AC_QUERY,
      variables: { username, limit: RECENT_SOLVES_CAP },
    }),
  });

  if (!res.ok) {
    return { solves: [], historyPublic: true, error: `LeetCode: ${res.message}` };
  }
  if (res.data.errors?.length) {
    return {
      solves: [],
      historyPublic: true,
      error: `LeetCode: ${res.data.errors[0].message}`,
    };
  }

  const rows = res.data.data?.recentAcSubmissionList ?? [];
  const solves: RecentSolve[] = rows
    .filter((r) => typeof r?.titleSlug === "string" && r.titleSlug.length > 0)
    .map((r) => ({ slug: r.titleSlug, at: Number(r.timestamp) || 0 }));

  return {
    solves,
    // Empty feed + a non-zero lifetime count can only mean the history is
    // hidden. Not an error — nothing is broken, the member just has to flip a
    // setting for challenge matching to work.
    historyPublic: !(solves.length === 0 && knownSolveTotal > 0),
    error: null,
  };
}
