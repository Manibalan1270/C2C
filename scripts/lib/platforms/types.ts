import type { CodingPlatform, ProblemDifficulty } from "../../../src/types/schema";

/** One accepted solve discovered on a platform. */
export interface RemoteSolve {
  platform: CodingPlatform;
  /** Stable per-platform identifier — becomes part of the pointsLog doc id,
   *  so it must be the same string every run for the same problem. */
  slug: string;
  title: string;
  /** null when the platform doesn't expose it (HackerRank). */
  difficulty: ProblemDifficulty | null;
  /** When the solve happened, if known; the engine falls back to "now". */
  solvedAt: Date | null;
  url: string | null;
}

export interface PlatformFetchResult {
  solves: RemoteSolve[];
  /** Non-fatal problem worth surfacing on the member's profile, e.g. a
   *  username that doesn't resolve. */
  error: string | null;
}

/** Fail closed and explain, rather than throwing and killing the whole run. */
export function fetchFailure(message: string): PlatformFetchResult {
  return { solves: [], error: message };
}
