import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  COLLECTIONS,
  type AdminAction,
  type AdminAuditLogDoc,
  type BadgeDoc,
  type UserDoc,
  type UserRole,
} from "../../types/schema";

export interface Actor {
  uid: string;
  name: string;
}

/**
 * Records a privileged action. Every mutating function below calls this, and
 * deliberately does so *after* the mutation succeeds — a log entry for a
 * write that failed would be worse than no entry at all.
 *
 * Audit failures are swallowed: losing the log entry is bad, but failing the
 * admin's actual action because the logging write failed is worse, and would
 * leave them retrying an operation that already succeeded.
 */
export async function recordAudit(
  actor: Actor,
  action: AdminAction,
  detail: string,
  target?: { uid: string | null; label: string | null },
): Promise<void> {
  try {
    const ref = doc(collection(db, COLLECTIONS.adminAuditLog));
    const body: WithFieldValue<AdminAuditLogDoc> = {
      logId: ref.id,
      actorUid: actor.uid,
      actorName: actor.name,
      action,
      targetUid: target?.uid ?? null,
      targetLabel: target?.label ?? null,
      detail,
      at: serverTimestamp(),
    };
    await setDoc(ref, body);
  } catch (err) {
    console.error("Audit log write failed (the action itself succeeded):", err);
  }
}

export async function fetchAllMembers(): Promise<UserDoc[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.users), orderBy("xp", "desc")));
  return snap.docs.map((d) => d.data() as UserDoc);
}

export async function fetchAuditLog(max = 50): Promise<AdminAuditLogDoc[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.adminAuditLog), orderBy("at", "desc"), fbLimit(max)),
  );
  return snap.docs.map((d) => d.data() as AdminAuditLogDoc);
}

export async function changeRole(
  actor: Actor,
  target: UserDoc,
  nextRole: UserRole,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, target.uid), {
    role: nextRole,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "role.change", `${target.role} → ${nextRole}`, {
    uid: target.uid,
    label: target.name,
  });
}

/**
 * Absolute set rather than an increment: an admin typing a number into a box
 * means "make it this", and an increment would race the sync engine's own
 * increments in a way that's impossible to reason about from the UI.
 */
export async function setXp(actor: Actor, target: UserDoc, nextXp: number): Promise<void> {
  const level = Math.floor(Math.max(0, nextXp) / 500) + 1;
  await updateDoc(doc(db, COLLECTIONS.users, target.uid), {
    xp: nextXp,
    level,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "xp.adjust", `${target.xp} → ${nextXp} XP`, {
    uid: target.uid,
    label: target.name,
  });
}

export async function grantBadge(
  actor: Actor,
  target: UserDoc,
  badgeId: string,
): Promise<void> {
  const next = Array.from(new Set([...(target.badgeIds ?? []), badgeId]));
  await updateDoc(doc(db, COLLECTIONS.users, target.uid), {
    badgeIds: next,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "badge.grant", `granted "${badgeId}"`, {
    uid: target.uid,
    label: target.name,
  });
}

export async function revokeBadge(
  actor: Actor,
  target: UserDoc,
  badgeId: string,
): Promise<void> {
  const next = (target.badgeIds ?? []).filter((id) => id !== badgeId);
  await updateDoc(doc(db, COLLECTIONS.users, target.uid), {
    badgeIds: next,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "badge.revoke", `revoked "${badgeId}"`, {
    uid: target.uid,
    label: target.name,
  });
}

/** Clears a member's platform handle — the fix when someone typo'd it and
 *  the sync engine keeps erroring on their profile. */
export async function unlinkPlatform(
  actor: Actor,
  target: UserDoc,
  platform: "leetcode" | "hackerrank",
): Promise<void> {
  const field = platform === "leetcode" ? "leetcodeUsername" : "hackerrankUsername";
  await updateDoc(doc(db, COLLECTIONS.users, target.uid), {
    [field]: null,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "account.unlink", `unlinked ${platform}`, {
    uid: target.uid,
    label: target.name,
  });
}

// --- Badge definitions -----------------------------------------------------

export async function fetchBadgeDefinitions(): Promise<BadgeDoc[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.badges));
  return snap.docs
    .map((d) => d.data() as BadgeDoc)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export async function upsertBadgeDefinition(
  actor: Actor,
  badge: BadgeDoc,
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.badges, badge.badgeId), badge, { merge: true });
  await recordAudit(actor, "badge.define", `saved badge "${badge.name}"`, {
    uid: null,
    label: badge.badgeId,
  });
}

export async function deleteBadgeDefinition(
  actor: Actor,
  badge: BadgeDoc,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.badges, badge.badgeId));
  await recordAudit(actor, "badge.define", `deleted badge "${badge.name}"`, {
    uid: null,
    label: badge.badgeId,
  });
}
