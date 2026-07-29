/**
 * C2C Firestore Data Schema — frozen contract (Sprint Plan Phase 1)
 *
 * Source of truth: C2C_SRS.pdf, section 7 "Database Collections".
 * DO NOT add/rename/remove a field without pinging the whole team first —
 * every feature branch is built against these exact shapes.
 *
 * Collections marked [V1] are built in the 1.5-day sprint.
 * Collections marked [V2] exist here for reference / future work,
 * not built in v1.
 */

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type UserRole = "guest" | "member" | "mentor" | "admin" | "super_admin";

export type ChallengeTier = "easy" | "medium" | "hard" | "surprise";

export type CodingPlatform = "leetcode" | "hackerrank";

export type RankMovement = "up" | "down" | "same";

// ---------------------------------------------------------------------------
// [V1] Users  — collection: "users", doc id = uid (Firebase Auth uid)
// Owner: Rahul (Auth + Profile)
// ---------------------------------------------------------------------------
export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  leetcodeUsername: string | null;
  hackerrankUsername: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  badgeIds: string[]; // [V1] static seed list; auto-detection is [V2]
  roadmapIds: string[]; // [V2] — kept empty in v1
  teamIds: string[]; // [V2] — kept empty in v1
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V1] Weekly Challenges — collection: "weeklyChallenges"
// Owner: Suraj
// ---------------------------------------------------------------------------
export interface WeeklyChallengeDoc {
  challengeId: string;
  week: string; // ISO week key, e.g. "2026-W31"
  tier: ChallengeTier;
  title: string;
  problemUrl: string | null;
  requiredCount: number;
  points: number;
  xp: number;
  createdBy: string; // uid of admin who created it
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V1] Points Log — collection: "pointsLog"
// Owner: Suraj (writer) — Rohan/Roshan read
// ---------------------------------------------------------------------------
export interface PointsLogDoc {
  logId: string;
  uid: string;
  challengeId: string | null; // null if awarded outside a challenge (v2 use)
  problem: string;
  platform: CodingPlatform | null;
  pointsAwarded: number;
  xpAwarded: number;
  awardedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V1] Leaderboard — collection: "leaderboardSnapshots"
// Owner: Roshan
// ---------------------------------------------------------------------------
export interface LeaderboardEntry {
  uid: string;
  name: string;
  xp: number;
  rank: number;
}

export interface LeaderboardSnapshotDoc {
  snapshotId: string;
  week: string;
  rankings: LeaderboardEntry[];
  previousRankings: LeaderboardEntry[];
  rankMovement: Record<string, { direction: RankMovement; delta: number }>; // keyed by uid
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V2] Badges — collection: "badges"
// ---------------------------------------------------------------------------
export interface BadgeDoc {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  criteriaType: string;
  criteriaValue: number;
}

// [V2] Member Badges — collection: "memberBadges"
export interface MemberBadgeDoc {
  memberBadgeId: string;
  uid: string;
  badgeId: string;
  awardedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V2] Roadmaps — collection: "roadmaps"
// ---------------------------------------------------------------------------
export type RoadmapTrack = "DSA" | "CP" | "WebDev" | "AI" | "Android" | "DevOps";

export interface RoadmapTask {
  taskId: string;
  title: string;
  order: number;
}

export interface RoadmapDoc {
  roadmapId: string;
  track: RoadmapTrack;
  title: string;
  tasks: RoadmapTask[];
}

// [V2] Roadmap Progress — collection: "roadmapProgress"
export interface RoadmapProgressDoc {
  progressId: string;
  uid: string;
  roadmapId: string;
  completedTaskIds: string[];
  currentTaskId: string | null;
}

// ---------------------------------------------------------------------------
// [V2] Teams — collection: "teams"
// ---------------------------------------------------------------------------
export interface TeamDoc {
  teamId: string;
  name: string;
  description: string;
  eventName: string | null;
  leadUid: string;
  memberUids: string[];
  pendingInviteUids: string[];
}

// ---------------------------------------------------------------------------
// [V2] Calendar Events — collection: "calendarEvents"
// ---------------------------------------------------------------------------
export type CalendarCategory =
  | "target"
  | "club_event"
  | "contest"
  | "hackathon"
  | "workshop"
  | "deadline";

export interface CalendarEventDoc {
  eventId: string;
  title: string;
  category: CalendarCategory;
  startDate: Timestamp;
  endDate: Timestamp;
  description: string;
}

// ---------------------------------------------------------------------------
// [V1 - minimal] Announcements — collection: "announcements"
// Owner: Yalini (admin write), Rohan (dashboard read)
// ---------------------------------------------------------------------------
export interface AnnouncementDoc {
  announcementId: string;
  title: string;
  body: string;
  postedBy: string; // uid
  postedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V2] Mentor Messages — collection: "mentorMessages"
// ---------------------------------------------------------------------------
export interface MentorMessageDoc {
  messageId: string;
  fromUid: string;
  toUid: string | null;
  toTeamId: string | null;
  body: string;
  sentAt: Timestamp;
}

// ---------------------------------------------------------------------------
// [V2] Contests — collection: "contests"
// ---------------------------------------------------------------------------
export interface ContestResult {
  uid: string;
  rank: number;
  score: number;
}

export interface ContestDoc {
  contestId: string;
  title: string;
  date: Timestamp;
  description: string;
  participants: string[]; // uids
  results: ContestResult[];
}

// ---------------------------------------------------------------------------
// [V2] Blog Posts — collection: "blogPosts"
// ---------------------------------------------------------------------------
export type BlogCategory = "news" | "journey";
export type BlogStatus = "draft" | "published";

export interface BlogPostDoc {
  postId: string;
  title: string;
  category: BlogCategory;
  author: string; // uid
  status: BlogStatus;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Firestore collection name constants — import these, never hardcode strings
// ---------------------------------------------------------------------------
export const COLLECTIONS = {
  users: "users",
  weeklyChallenges: "weeklyChallenges",
  pointsLog: "pointsLog",
  leaderboardSnapshots: "leaderboardSnapshots",
  announcements: "announcements",
  // v2
  badges: "badges",
  memberBadges: "memberBadges",
  roadmaps: "roadmaps",
  roadmapProgress: "roadmapProgress",
  teams: "teams",
  calendarEvents: "calendarEvents",
  mentorMessages: "mentorMessages",
  contests: "contests",
  blogPosts: "blogPosts",
} as const;
