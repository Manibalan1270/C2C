import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  COLLECTIONS,
  type ChallengeTier,
  type WeeklyChallengeDoc,
  type WeeklyGoalDoc,
} from "../../types/schema";

/** Tier sort order — tier sorted lexicographically is easy/hard/medium/
 *  surprise, which is wrong; this is the intended reading order. */
const TIER_ORDER: Record<ChallengeTier, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  surprise: 3,
};

function sortChallenges(challenges: WeeklyChallengeDoc[]): WeeklyChallengeDoc[] {
  return [...challenges].sort(
    (a, b) => (a.order ?? TIER_ORDER[a.tier]) - (b.order ?? TIER_ORDER[b.tier]),
  );
}

/**
 * The newest week that has any challenges posted — not necessarily the
 * current ISO week, so the page can show last week's set rather than an
 * empty page if this week's hasn't been posted yet. One query
 * (orderBy week desc), grouped client-side; no composite index needed.
 */
export async function fetchLatestWeeklyChallenges(): Promise<{
  week: string | null;
  challenges: WeeklyChallengeDoc[];
}> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.weeklyChallenges),
      orderBy("week", "desc"),
      fbLimit(24),
    ),
  );
  const all = snap.docs.map((d) => d.data() as WeeklyChallengeDoc);
  if (all.length === 0) return { week: null, challenges: [] };

  const latestWeek = all[0].week;
  const challenges = all.filter(
    (c) => c.week === latestWeek && (c.active ?? true),
  );
  return { week: latestWeek, challenges: sortChallenges(challenges) };
}

export async function fetchWeeklyGoal(week: string): Promise<WeeklyGoalDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.weeklyGoals, week));
  return snap.exists() ? (snap.data() as WeeklyGoalDoc) : null;
}

export interface CreateChallengeInput {
  week: string;
  tier: ChallengeTier;
  difficulty: WeeklyChallengeDoc["difficulty"];
  title: string;
  problemUrl: string | null;
  requiredCount: number;
  points: number;
  xp: number;
  order: number;
}

/**
 * The doc id must be pre-generated so `challengeId` in the body matches the
 * doc's own id — the schema duplicates it, and `addDoc` can't do that.
 */
export async function createWeeklyChallenge(
  input: CreateChallengeInput,
  adminUid: string,
): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.weeklyChallenges));
  const body: WithFieldValue<WeeklyChallengeDoc> = {
    challengeId: ref.id,
    ...input,
    platform: null,
    active: true,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  return ref.id;
}

export async function deleteWeeklyChallenge(challengeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.weeklyChallenges, challengeId));
}

export async function upsertWeeklyGoal(
  input: { week: string; label: string; target: number },
  adminUid: string,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.weeklyGoals, input.week);
  const body: WithFieldValue<WeeklyGoalDoc> = {
    ...input,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, body, { merge: true });
}
