import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, type FieldValue } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS, type UserDoc } from "../types/schema";

/**
 * Firestore rejects a `Timestamp` we'd have to invent client-side, so the
 * two timestamp fields go in as sentinels and come back as Timestamps.
 */
type NewUserDoc = Omit<UserDoc, "createdAt" | "updatedAt"> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

/**
 * Everyone starts as a plain member with a zeroed scoreboard. The security
 * rules pin these three values on create (`role === 'member'`, `xp === 0`,
 * `level === 1`) precisely so a member can't seed themselves an admin role
 * or a head start — promotions happen server-side or from the console.
 */
function initialDoc(user: User): NewUserDoc {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split("@")[0] ?? "Member",
    email: user.email ?? "",
    role: "member",
    leetcodeUsername: null,
    hackerrankUsername: null,
    xp: 0,
    level: 1,
    currentStreak: 0,
    bestStreak: 0,
    badgeIds: [],
    roadmapIds: [],
    teamIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Creates the signed-in member's profile document if it doesn't exist yet.
 * Does not return the doc — the caller (AuthContext) picks it up through
 * its own `onSnapshot` listener once this resolves, so there's exactly one
 * source of truth for "what does my profile currently say" rather than two
 * (this function's return value and the listener) that could disagree.
 *
 * Swallows errors rather than throwing: a Firestore hiccup on first login
 * must not prevent the member from being considered authenticated. If
 * creation fails here, the listener in AuthContext will simply see no doc
 * and the UI treats that as "profile not set up yet" rather than crashing.
 */
export async function ensureUserDoc(user: User): Promise<void> {
  const ref = doc(db, COLLECTIONS.users, user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return;
  } catch (err) {
    console.error("Could not check for an existing user profile:", err);
    return;
  }

  try {
    await setDoc(ref, initialDoc(user));
  } catch (err) {
    console.error("Could not create user profile:", err);
  }
}
