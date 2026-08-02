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

/**
 * The subset of a Firestore Timestamp that both SDKs provide.
 *
 * These docs are written by two different clients: the browser (the
 * `firebase/firestore` SDK) and the sync engine running under Node (the
 * `firebase-admin/firestore` SDK). Those SDKs export *different* Timestamp
 * classes which are structurally near-identical but not assignable to each
 * other, so importing either one here would make the shared contract
 * unusable from the other side.
 *
 * Widening to the common shape keeps every existing consumer compiling —
 * a real Timestamp from either SDK satisfies this — while letting the
 * engine construct these docs without casts.
 */
export interface Timestamp {
  toDate(): Date;
  toMillis(): number;
  readonly seconds: number;
  readonly nanoseconds: number;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type UserRole = "guest" | "member" | "mentor" | "admin" | "super_admin";

export type ChallengeTier = "easy" | "medium" | "hard" | "surprise";

export type CodingPlatform = "leetcode" | "hackerrank";

export type RankMovement = "up" | "down" | "same";

export type ProblemDifficulty = "easy" | "medium" | "hard";

export type BadgeCriteriaType =
  | "first_solve"
  | "streak_days"
  | "total_solved"
  | "hard_solved"
  | "weekly_sweep"
  | "xp_total"
  | "manual";

/** A club-timezone (Asia/Kolkata) calendar day, "YYYY-MM-DD". */
export interface DailySolvedEntry {
  date: string;
  count: number;
}

export interface WeeklyRankEntry {
  week: string;
  rank: number;
}

/** Lifetime solved counts as reported by a platform itself. */
export interface PlatformSolvedCounts {
  easy: number;
  medium: number;
  hard: number;
}

/**
 * The sync engine's bookmark per platform, so it can tell what's new.
 *
 * This exists because neither platform exposes per-submission history to a
 * logged-out reader any more — LeetCode's `recentAcSubmissionList` returns
 * an empty array without auth even for users with hundreds of solves. All
 * that's publicly readable is *lifetime counts*, so "what did they solve
 * since last time" has to be a delta against a stored previous count.
 *
 * Consequence worth knowing: the engine knows how many problems a member
 * solved between two runs, but not which ones or exactly when. Awards are
 * therefore dated at sync time (accurate to the cron interval), and a solve
 * can't be automatically matched to a specific weekly challenge.
 */
export interface PlatformSyncState {
  leetcode?: PlatformSolvedCounts | null;
  /** Count of HackerRank badges last seen. */
  hackerrankBadges?: number | null;
}

/**
 * Denormalised dashboard cache, written only by the sync engine (a
 * scheduled GitHub Actions job using the admin SDK — see UserDoc.stats).
 * Absent until the first sync run; the client derives a fallback from
 * pointsLog/leaderboardSnapshots when missing or stale.
 */
export interface UserStatsCache {
  week: string; // ISO week key this was computed for, e.g. "2026-W31"
  rank: number | null;
  previousRank: number | null;
  rankDirection: RankMovement;
  rankDelta: number;
  rankHistory: WeeklyRankEntry[]; // oldest -> newest, max 8
  dailySolved: DailySolvedEntry[]; // oldest -> newest, exactly 14
  solvedByDifficulty: Record<ProblemDifficulty, number>;
  weeklySolvedCount: number;
  totalSolved: number;
  computedAt: Timestamp;
}

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

  // --- Additive, server-owned. Never in the client's editable field list
  // (see firestore.rules onlyMemberEditableFields) — written only by the
  // sync engine. Optional because they're absent until the first sync run.
  stats?: UserStatsCache | null;
  /** The sync engine's per-platform bookmark — see PlatformSyncState. */
  syncState?: PlatformSyncState | null;
  lastSyncedAt?: Timestamp | null;
  /** Human-readable reason the last sync failed (e.g. a typo'd username),
   *  surfaced on the Profile page. */
  lastSyncError?: string | null;
  /**
   * Whether the member's LeetCode submission history is publicly readable.
   *
   * Written by the sync engine, which can detect it: an empty recent-solves
   * feed on an account with a non-zero lifetime count means the history is
   * hidden. Not an error — everything except per-challenge completion still
   * works — so it's a separate field from `lastSyncError`, and the Profile
   * page uses it to explain why challenges aren't ticking off rather than
   * leaving the member to guess.
   *
   * Undefined until the first sync run has looked.
   */
  leetcodeHistoryPublic?: boolean | null;
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

  // --- Additive. `difficulty` is what pointsLog matches against — `tier`
  // is the club-facing label ("surprise" isn't a difficulty). `order` fixes
  // display order (tier sorted lexicographically is wrong: easy/hard/medium/
  // surprise); treat undefined as sorted by a fixed tier order instead.
  // `active` undefined means true.
  difficulty?: ProblemDifficulty | null;
  platform?: CodingPlatform | null;
  order?: number;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// [V1] Weekly Goals — collection: "weeklyGoals", doc id = ISO week key
// ---------------------------------------------------------------------------
export interface WeeklyGoalDoc {
  week: string; // doc id, e.g. "2026-W31"
  label: string;
  target: number;
  createdBy: string;
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

  // Required — no existing consumers construct this type, so this can be
  // required rather than optional; that forces the sync engine to decide
  // rather than silently omitting it, and unlocks solvedByDifficulty.
  difficulty: ProblemDifficulty | null;
  /** Platform problem slug. Combined with uid+platform as
   *  `${uid}__${platform}__${problemSlug}`, this is the sync engine's
   *  deterministic doc id — a re-run can't double-award the same solve. */
  problemSlug?: string | null;
  /** ISO week of awardedAt, denormalised to avoid a range query. */
  week?: string;
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
// [V1] Badges — collection: "badges"
// Promoted from V2: the Profile page shows badge names/descriptions, and
// UserDoc.badgeIds (V1) is the sole source of truth for *which* badges a
// member has — this collection is just their display metadata. Seeded via
// the admin SDK; clients are read-only (see firestore.rules).
// ---------------------------------------------------------------------------
export interface BadgeDoc {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string | null; // seeds use icon components, not hosted URLs
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
  order?: number; // display order on Profile
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
// [V1] Admin Audit Log — collection: "adminAuditLog"
//
// Append-only record of every privileged action (role changes, XP
// adjustments, badge grants). Exists because those actions are otherwise
// invisible and irreversible-looking: when a member's XP changes without
// them solving anything, somebody needs to be able to answer "who did that,
// and why". Rules allow admins to create and read, never to update or
// delete — an audit log you can edit isn't one.
// ---------------------------------------------------------------------------
export type AdminAction =
  | "role.change"
  | "xp.adjust"
  | "badge.grant"
  | "badge.revoke"
  | "account.unlink"
  | "announcement.create"
  | "announcement.delete"
  | "challenge.create"
  | "challenge.delete"
  | "badge.define"
  // Public-site content. Worth auditing for the same reason the rest is:
  // these edits are visible to the whole internet, so "who put that on the
  // homepage" needs an answer.
  | "event.create"
  | "event.update"
  | "event.delete"
  | "board.create"
  | "board.update"
  | "board.delete"
  | "post.create"
  | "post.update"
  | "post.delete";

export interface AdminAuditLogDoc {
  logId: string;
  actorUid: string;
  actorName: string;
  action: AdminAction;
  targetUid: string | null;
  targetLabel: string | null;
  /** Human-readable summary, e.g. "member -> admin" or "+250 XP". */
  detail: string;
  at: Timestamp;
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
// [V1] Blog Posts — collection: "blogPosts"
//
// Promoted from V2: the public landing page has always rendered this section,
// it just had no way to write it and no rule permitting a read.
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

  /** Byline shown publicly. `author` is a uid, which the public site can't
   *  resolve — anonymous visitors can't read `users`. Denormalised on write. */
  authorName?: string;
}

// ---------------------------------------------------------------------------
// [V1] PUBLIC SITE CONTENT
//
// These three collections back the marketing site's Events, Board Members and
// Blog sections. They are deliberately SEPARATE from anything in the members
// area, and that separation is the whole point of them existing:
//
//   - Events used to render `weeklyChallenges`, so a challenge posted for
//     members appeared to the public as a club event.
//   - Board Members used to be derived from `users where role in (admin,
//     super_admin)`, which quietly meant "granting someone admin access"
//     and "putting their name on the public homepage" were the same action.
//     They are not the same decision and must not share a switch.
//
// They are also the only collections in this file that are readable by
// ANONYMOUS visitors — see firestore.rules. Never put anything in one of
// these documents that isn't intended to be world-readable.
// ---------------------------------------------------------------------------

/**
 * An image stored inline as a `data:image/jpeg;base64,...` URL.
 *
 * Deliberately not a Storage bucket URL: Firebase Storage requires the Blaze
 * plan, and this project runs on Spark. The admin-side cropper resizes and
 * re-encodes before writing, so a stored image lands around 100-200KB against
 * Firestore's 1MB per-document ceiling. MAX_INLINE_IMAGE_BYTES is enforced in
 * the UI, in the query layer, and again in the security rules.
 */
export type InlineImage = string;

/** Hard cap on a stored image. Firestore's doc limit is 1MB total, and the
 *  document needs room for its text fields alongside the image. */
export const MAX_INLINE_IMAGE_BYTES = 700_000;

export interface SiteEventDoc {
  eventId: string;
  title: string;
  description: string;
  /** Free text, e.g. "12 March 2026" or "Every Friday" — events are announced
   *  in a lot of shapes and a Timestamp forces a precision we don't have.
   *  This is what the public site DISPLAYS. */
  dateLabel: string;
  /**
   * Machine-readable date, "YYYY-MM-DD", or null for undated/recurring events.
   *
   * Separate from `dateLabel` rather than replacing it, because the two do
   * different jobs: the label has to be able to say "Every Friday" or "TBC",
   * which no date type can express, while sorting and expiry need something a
   * computer can compare. Optional on purpose — a recurring event legitimately
   * has no single date, and forcing one would mean inventing data.
   *
   * A plain ISO string rather than a Timestamp: this is a calendar day, not an
   * instant, so it has no timezone, and ISO strings sort lexicographically for
   * free.
   */
  startDate?: string | null;
  location: string | null;
  imageUrl: InlineImage | null;
  /** Lower sorts first. Explicit because a club's event ordering is editorial,
   *  not chronological — the next big thing goes on top regardless of date. */
  order: number;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BoardMemberDoc {
  memberId: string;
  name: string;
  /** e.g. "Chairperson", "Technical Lead". Free text, not a UserRole — a board
   *  title is a public-facing label and has nothing to do with access. */
  title: string;
  imageUrl: InlineImage | null;
  /** Optional public link (LinkedIn/GitHub). */
  linkUrl: string | null;
  order: number;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Firestore collection name constants — import these, never hardcode strings
// ---------------------------------------------------------------------------
export const COLLECTIONS = {
  users: "users",
  weeklyChallenges: "weeklyChallenges",
  weeklyGoals: "weeklyGoals",
  pointsLog: "pointsLog",
  leaderboardSnapshots: "leaderboardSnapshots",
  announcements: "announcements",
  badges: "badges", // promoted to v1 — see BadgeDoc
  adminAuditLog: "adminAuditLog",
  // Public site content — world-readable, admin-written. See the block above.
  siteEvents: "siteEvents",
  boardMembers: "boardMembers",
  blogPosts: "blogPosts", // promoted to v1
  // v2
  memberBadges: "memberBadges",
  roadmaps: "roadmaps",
  roadmapProgress: "roadmapProgress",
  teams: "teams",
  calendarEvents: "calendarEvents",
  mentorMessages: "mentorMessages",
  contests: "contests",
} as const;
