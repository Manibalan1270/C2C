/**
 * Pure XP/level math — no Firebase, no React. Shared by the browser and,
 * later, the Node-based sync engine (imported via `tsx`), so a member's
 * level always means the same thing regardless of which side computed it.
 */

export const XP_PER_LEVEL = 500;

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function xpIntoLevel(xp: number): number {
  return Math.max(0, xp) % XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): number {
  return XP_PER_LEVEL - xpIntoLevel(xp);
}

export const DEFAULT_WEEKLY_GOAL = {
  label: "Solve 5 problems this week",
  target: 5,
} as const;

/**
 * The XP economy. Lives here rather than in the sync engine because the
 * seed scripts, the admin UI's defaults, and the engine must all agree —
 * and because a member reading "45 XP" on a challenge card should get
 * exactly 45 XP when they solve it.
 */
export const AWARD_BY_DIFFICULTY = {
  easy: { points: 10, xp: 20 },
  medium: { points: 25, xp: 45 },
  hard: { points: 50, xp: 90 },
} as const;

/** Award for a solve with no known difficulty (HackerRank, mostly). */
export const AWARD_UNKNOWN = { points: 10, xp: 15 } as const;
