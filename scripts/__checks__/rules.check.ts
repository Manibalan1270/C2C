/**
 * Security rules test suite — runs the real firestore.rules against the
 * Firestore emulator and attempts actual attacks.
 *
 * This is the only kind of security testing that means anything for this
 * project. Firestore rules ARE the authorisation layer: there is no server in
 * between, so every client is an attacker with a direct database connection
 * and a browser devtools console. Reading the rules and reasoning about them
 * is not evidence — the emulator running the actual file is.
 *
 * Every case is written as "an attacker tries X, and must be denied", with a
 * handful of "a legitimate user does Y, and must be allowed" so a rule that
 * denies everything can't pass by accident.
 *
 * Run:  npm run check:rules      (starts the emulator itself)
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "node:fs";

const PROJECT_ID = "c2c-rules-test";

let env: RulesTestEnvironment;
let passed = 0;
let failed = 0;

async function expectDenied(label: string, op: () => Promise<unknown>) {
  try {
    await assertFails(op());
    console.log(`  PASS  denied: ${label}`);
    passed += 1;
  } catch {
    console.log(`  FAIL  ALLOWED (should be denied): ${label}`);
    failed += 1;
  }
}

async function expectAllowed(label: string, op: () => Promise<unknown>) {
  try {
    await assertSucceeds(op());
    console.log(`  PASS  allowed: ${label}`);
    passed += 1;
  } catch (e) {
    console.log(`  FAIL  DENIED (should be allowed): ${label} — ${(e as Error).message?.slice(0, 90)}`);
    failed += 1;
  }
}

/** A signed-in @svce.ac.in member. */
function member(uid: string) {
  return env.authenticatedContext(uid, { email: `${uid}@svce.ac.in`, email_verified: true }).firestore();
}
/** Signed in, but with an outside email — must be treated as untrusted. */
function outsider(uid: string) {
  return env.authenticatedContext(uid, { email: `${uid}@gmail.com`, email_verified: true }).firestore();
}
function anon() {
  return env.unauthenticatedContext().firestore();
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // Seed with rules disabled so the fixtures themselves aren't a test.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), {
      uid: "alice", name: "Alice", email: "alice@svce.ac.in", role: "member",
      xp: 100, level: 1, badgeIds: [], leetcodeUsername: null, hackerrankUsername: null,
      currentStreak: 0, bestStreak: 0, roadmapIds: [], teamIds: [],
    });
    await setDoc(doc(db, "users/adminuser"), {
      uid: "adminuser", name: "Admin", email: "adminuser@svce.ac.in", role: "admin",
      xp: 0, level: 1, badgeIds: [], leetcodeUsername: null, hackerrankUsername: null,
      currentStreak: 0, bestStreak: 0, roadmapIds: [], teamIds: [],
    });
    await setDoc(doc(db, "siteEvents/e1"), {
      eventId: "e1", title: "Public Event", description: "", dateLabel: "",
      location: null, imageUrl: null, order: 0, published: true,
    });
    await setDoc(doc(db, "boardMembers/b1"), {
      memberId: "b1", name: "Chair", title: "Chairperson", imageUrl: null,
      linkUrl: null, order: 0, published: true,
    });
    await setDoc(doc(db, "blogPosts/p1"), {
      postId: "p1", title: "Post", category: "news", status: "published", body: "hi",
    });
    await setDoc(doc(db, "pointsLog/l1"), { logId: "l1", uid: "alice", xpAwarded: 10 });
    await setDoc(doc(db, "adminAuditLog/a1"), {
      logId: "a1", actorUid: "adminuser", action: "role.change", detail: "x",
    });
    await setDoc(doc(db, "leaderboardSnapshots/s1"), { snapshotId: "s1", week: "2026-W31" });
  });

  console.log("\n--- PUBLIC SITE: anonymous visitors must be able to READ ---");
  await expectAllowed("anon reads siteEvents", () => getDocs(collection(anon(), "siteEvents")));
  await expectAllowed("anon reads boardMembers", () => getDocs(collection(anon(), "boardMembers")));
  await expectAllowed("anon reads blogPosts", () => getDocs(collection(anon(), "blogPosts")));

  console.log("\n--- PUBLIC SITE: nobody but an admin may WRITE ---");
  await expectDenied("anon creates an event", () =>
    setDoc(doc(anon(), "siteEvents/evil"), { title: "x", description: "", dateLabel: "", location: null, imageUrl: null, order: 0, published: true }));
  await expectDenied("anon defaces an existing event", () =>
    updateDoc(doc(anon(), "siteEvents/e1"), { title: "HACKED" }));
  await expectDenied("anon deletes an event", () => deleteDoc(doc(anon(), "siteEvents/e1")));
  await expectDenied("member (non-admin) creates an event", () =>
    setDoc(doc(member("alice"), "siteEvents/evil2"), { title: "x", description: "", dateLabel: "", location: null, imageUrl: null, order: 0, published: true }));
  await expectDenied("member defaces a board member", () =>
    updateDoc(doc(member("alice"), "boardMembers/b1"), { name: "HACKED" }));
  await expectDenied("member deletes a blog post", () => deleteDoc(doc(member("alice"), "blogPosts/p1")));

  console.log("\n--- PRIVATE DATA: must NOT leak to the public site's audience ---");
  await expectDenied("anon reads users", () => getDocs(collection(anon(), "users")));
  await expectDenied("anon reads a specific user", () => getDoc(doc(anon(), "users/alice")));
  await expectDenied("anon reads pointsLog", () => getDocs(collection(anon(), "pointsLog")));
  await expectDenied("anon reads leaderboardSnapshots", () => getDocs(collection(anon(), "leaderboardSnapshots")));
  await expectDenied("anon reads adminAuditLog", () => getDocs(collection(anon(), "adminAuditLog")));
  await expectDenied("outsider (non-svce email) reads users", () => getDocs(collection(outsider("mallory"), "users")));

  console.log("\n--- PRIVILEGE ESCALATION ---");
  await expectDenied("member promotes THEMSELF to admin", () =>
    updateDoc(doc(member("alice"), "users/alice"), { role: "admin" }));
  await expectDenied("member promotes themself to super_admin", () =>
    updateDoc(doc(member("alice"), "users/alice"), { role: "super_admin" }));
  await expectDenied("admin promotes someone to SUPER_admin (reserved to super_admin)", () =>
    updateDoc(doc(member("adminuser"), "users/alice"), { role: "super_admin", xp: 100, level: 1, badgeIds: [] }));
  await expectDenied("member edits ANOTHER member's profile", () =>
    updateDoc(doc(member("alice"), "users/adminuser"), { name: "pwned" }));

  console.log("\n--- SCORE TAMPERING (the whole point of the leaderboard) ---");
  await expectDenied("member sets their own XP", () =>
    updateDoc(doc(member("alice"), "users/alice"), { xp: 999999 }));
  await expectDenied("member sets their own level", () =>
    updateDoc(doc(member("alice"), "users/alice"), { level: 99 }));
  await expectDenied("member grants themself a badge", () =>
    updateDoc(doc(member("alice"), "users/alice"), { badgeIds: ["legend"] }));
  await expectDenied("member sets their own streak", () =>
    updateDoc(doc(member("alice"), "users/alice"), { currentStreak: 365 }));
  await expectDenied("member forges a pointsLog award", () =>
    setDoc(doc(member("alice"), "pointsLog/forged"), { logId: "forged", uid: "alice", xpAwarded: 100000 }));
  await expectDenied("member edits an existing award", () =>
    updateDoc(doc(member("alice"), "pointsLog/l1"), { xpAwarded: 100000 }));
  await expectDenied("member writes a leaderboard snapshot", () =>
    setDoc(doc(member("alice"), "leaderboardSnapshots/forged"), { snapshotId: "forged", week: "2026-W31" }));
  await expectDenied("ADMIN writes a leaderboard snapshot (engine-only)", () =>
    setDoc(doc(member("adminuser"), "leaderboardSnapshots/forged2"), { snapshotId: "x", week: "2026-W31" }));
  await expectDenied("ADMIN forges a pointsLog award", () =>
    setDoc(doc(member("adminuser"), "pointsLog/forged3"), { logId: "x", uid: "alice", xpAwarded: 5000 }));

  console.log("\n--- ACCOUNT CREATION ---");
  await expectDenied("new user self-assigns admin at signup", () =>
    setDoc(doc(member("bob"), "users/bob"), { uid: "bob", role: "admin", xp: 0, level: 1 }));
  await expectDenied("new user seeds themself starting XP", () =>
    setDoc(doc(member("bob"), "users/bob"), { uid: "bob", role: "member", xp: 5000, level: 1 }));
  await expectDenied("user creates a doc under SOMEONE ELSE'S uid", () =>
    setDoc(doc(member("bob"), "users/carol"), { uid: "carol", role: "member", xp: 0, level: 1 }));
  await expectDenied("outsider (gmail) creates an account", () =>
    setDoc(doc(outsider("mallory"), "users/mallory"), { uid: "mallory", role: "member", xp: 0, level: 1 }));
  await expectAllowed("legit svce member creates their own doc", () =>
    setDoc(doc(member("bob"), "users/bob"), { uid: "bob", role: "member", xp: 0, level: 1 }));

  console.log("\n--- AUDIT LOG must be append-only ---");
  await expectDenied("admin rewrites an audit entry", () =>
    updateDoc(doc(member("adminuser"), "adminAuditLog/a1"), { detail: "covered up" }));
  await expectDenied("admin deletes an audit entry", () =>
    deleteDoc(doc(member("adminuser"), "adminAuditLog/a1")));
  await expectDenied("member reads the audit log", () =>
    getDocs(collection(member("alice"), "adminAuditLog")));
  await expectDenied("admin forges an entry attributed to someone else", () =>
    setDoc(doc(member("adminuser"), "adminAuditLog/forged"), { actorUid: "alice", action: "role.change", detail: "x" }));

  console.log("\n--- INPUT BOUNDS (blast-radius caps on a compromised admin) ---");
  const bigImage = "data:image/jpeg;base64," + "A".repeat(800_000);
  await expectDenied("admin writes an oversized inline image (>700KB)", () =>
    setDoc(doc(member("adminuser"), "siteEvents/big"), {
      title: "x", description: "", dateLabel: "", location: null,
      imageUrl: bigImage, order: 0, published: true }));
  await expectDenied("admin writes a non-image data URL (script smuggling)", () =>
    setDoc(doc(member("adminuser"), "siteEvents/js"), {
      title: "x", description: "", dateLabel: "", location: null,
      imageUrl: "data:text/html;base64,PHNjcmlwdD4=", order: 0, published: true }));
  await expectDenied("admin creates a 10000-XP challenge", () =>
    setDoc(doc(member("adminuser"), "weeklyChallenges/c1"), {
      week: "2026-W31", tier: "hard", title: "x", problemUrl: null,
      requiredCount: 1, points: 10, xp: 10000, createdBy: "adminuser" }));
  await expectDenied("admin creates a challenge with a malformed week key", () =>
    setDoc(doc(member("adminuser"), "weeklyChallenges/c2"), {
      week: "not-a-week", tier: "hard", title: "x", problemUrl: null,
      requiredCount: 1, points: 10, xp: 10, createdBy: "adminuser" }));
  await expectDenied("admin creates a challenge attributed to another admin", () =>
    setDoc(doc(member("adminuser"), "weeklyChallenges/c3"), {
      week: "2026-W31", tier: "hard", title: "x", problemUrl: null,
      requiredCount: 1, points: 10, xp: 10, createdBy: "someone-else" }));
  await expectAllowed("admin creates a well-formed challenge", () =>
    setDoc(doc(member("adminuser"), "weeklyChallenges/ok"), {
      week: "2026-W31", tier: "hard", title: "Valid", problemUrl: null,
      requiredCount: 1, points: 10, xp: 90, createdBy: "adminuser" }));
  await expectAllowed("admin creates a normal-sized event", () =>
    setDoc(doc(member("adminuser"), "siteEvents/ok"), {
      title: "Fine", description: "", dateLabel: "", location: null,
      imageUrl: null, order: 0, published: true }));

  console.log("\n--- LEGITIMATE MEMBER ACTIONS must still work ---");
  await expectAllowed("member links their own LeetCode handle", () =>
    updateDoc(doc(member("alice"), "users/alice"), { leetcodeUsername: "alice_lc" }));
  await expectAllowed("member reads another member (leaderboard needs this)", () =>
    getDoc(doc(member("alice"), "users/adminuser")));
  await expectAllowed("member reads challenges", () =>
    getDocs(collection(member("alice"), "weeklyChallenges")));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SECURITY RULES: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));
  await env.cleanup();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Suite crashed:", e);
  process.exit(1);
});
