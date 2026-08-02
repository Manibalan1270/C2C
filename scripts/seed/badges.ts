/**
 * Badge display metadata. Seeded via the admin SDK — clients can only read
 * this collection (see firestore.rules). Which badges a member actually
 * has lives on UserDoc.badgeIds; this is just the name/description for
 * whatever ids show up there.
 *
 * The first two ids match what the old mock data used, so nothing on the
 * Profile page regresses once it switches off mock data.
 */
import type { BadgeCriteriaType } from "../../src/types/schema";

export interface BadgeSeed {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string | null;
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
  order: number;
}

export const BADGE_SEEDS: BadgeSeed[] = [
  {
    badgeId: "first-accepted",
    name: "First Accepted",
    description: "Solved your first problem on a linked platform",
    iconUrl: null,
    criteriaType: "first_solve",
    criteriaValue: 1,
    order: 0,
  },
  {
    badgeId: "streak-7",
    name: "7 Day Streak",
    description: "Solved at least one problem, seven days running",
    iconUrl: null,
    criteriaType: "streak_days",
    criteriaValue: 7,
    order: 1,
  },
  {
    badgeId: "streak-30",
    name: "30 Day Streak",
    description: "A full month without missing a day",
    iconUrl: null,
    criteriaType: "streak_days",
    criteriaValue: 30,
    order: 2,
  },
  {
    badgeId: "century-club",
    name: "Century Club",
    description: "Solved 100 problems total",
    iconUrl: null,
    criteriaType: "total_solved",
    criteriaValue: 100,
    order: 3,
  },
  {
    badgeId: "hard-hitter",
    name: "Hard Hitter",
    description: "Solved 10 Hard-difficulty problems",
    iconUrl: null,
    criteriaType: "hard_solved",
    criteriaValue: 10,
    order: 4,
  },
  {
    badgeId: "weekly-sweep",
    name: "Weekly Sweep",
    description: "Cleared every challenge in a single week",
    iconUrl: null,
    criteriaType: "weekly_sweep",
    criteriaValue: 1,
    order: 5,
  },
  {
    badgeId: "level-5",
    name: "Level 5",
    description: "Reached level 5",
    iconUrl: null,
    criteriaType: "xp_total",
    criteriaValue: 2000,
    order: 6,
  },
  {
    badgeId: "first-challenge",
    name: "First Challenge",
    description: "Completed your first weekly challenge",
    iconUrl: null,
    criteriaType: "manual",
    criteriaValue: 1,
    order: 7,
  },
];
