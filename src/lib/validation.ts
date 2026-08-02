import type { CodingPlatform } from "../types/schema";

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

const PATTERNS: Record<CodingPlatform, RegExp> = {
  // LeetCode handles are case-sensitive in the profile URL.
  leetcode: /^[A-Za-z0-9_.-]{1,40}$/,
  hackerrank: /^[A-Za-z0-9_]{1,30}$/,
};

/**
 * Normalises and validates a pasted LeetCode/HackerRank identifier.
 *
 * The realistic input isn't a bare username — it's a pasted profile URL
 * (`https://leetcode.com/u/someone/`), so extracting the last non-empty
 * path segment before validating is the single highest-value bit of
 * handling here.
 */
export function normalizePlatformUsername(
  platform: CodingPlatform,
  raw: string,
): ValidationResult {
  let value = raw.trim();

  if (value === "") {
    return { ok: false, message: "Enter your username, or leave it unlinked." };
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const segments = url.pathname.split("/").filter(Boolean);
      value = segments[segments.length - 1] ?? value;
    } catch {
      // Not a real URL despite the scheme prefix — fall through and let
      // pattern validation reject it below.
    }
  }

  value = value.replace(/^@/, "").trim();

  // HackerRank profile URLs are lowercase; LeetCode's are case-sensitive,
  // so only normalise case for the platform where it's safe to.
  if (platform === "hackerrank") value = value.toLowerCase();

  if (!PATTERNS[platform].test(value)) {
    return {
      ok: false,
      message: `That doesn't look like a valid ${platform === "leetcode" ? "LeetCode" : "HackerRank"} username.`,
    };
  }

  return { ok: true, value };
}
