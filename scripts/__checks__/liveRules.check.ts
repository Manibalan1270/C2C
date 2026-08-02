/**
 * Attack suite run against the LIVE deployed rules as an anonymous client —
 * exactly what anyone on the internet can do with the public Firebase config
 * (which is embedded in the JS bundle and is not a secret).
 *
 * Only covers the unauthenticated surface. Escalation cases (a signed-in
 * member promoting themselves, forging XP, rewriting the audit log) need the
 * emulator, which requires JDK 21 — see npm run check:rules.
 *
 * Every write attempted here is expected to FAIL. If one succeeds it is both a
 * finding and pollution, so the suite reports it loudly.
 */
import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}, "attacker");
const db = getFirestore(app);

let pass = 0, fail = 0;
const findings: string[] = [];

async function denied(label: string, op: () => Promise<unknown>) {
  try { await op(); console.log(`  FAIL  *** ALLOWED *** ${label}`); fail++; findings.push(label); }
  catch (e) {
    const msg = (e as Error).message ?? "";
    if (/permission|insufficient|PERMISSION_DENIED/i.test(msg)) { console.log(`  PASS  denied: ${label}`); pass++; }
    else { console.log(`  WARN  failed for another reason: ${label} — ${msg.slice(0, 70)}`); pass++; }
  }
}
async function allowed(label: string, op: () => Promise<unknown>) {
  try { await op(); console.log(`  PASS  allowed: ${label}`); pass++; }
  catch (e) { console.log(`  FAIL  denied but should work: ${label} — ${(e as Error).message?.slice(0,70)}`); fail++; }
}

async function main() {
  console.log("ANONYMOUS ATTACKER vs LIVE RULES\n");

  console.log("-- public content must be readable (the site depends on it) --");
  await allowed("read siteEvents", () => getDocs(collection(db, "siteEvents")));
  await allowed("read boardMembers", () => getDocs(collection(db, "boardMembers")));
  await allowed("read blogPosts", () => getDocs(collection(db, "blogPosts")));

  console.log("\n-- private data must NOT be readable --");
  await denied("read users collection", () => getDocs(collection(db, "users")));
  await denied("read a known user doc", () => getDoc(doc(db, "users/rWaUP1lw7adylKN7jl52KzQ8iJ52")));
  await denied("read pointsLog (XP ledger)", () => getDocs(collection(db, "pointsLog")));
  await denied("read leaderboardSnapshots", () => getDocs(collection(db, "leaderboardSnapshots")));
  await denied("read adminAuditLog", () => getDocs(collection(db, "adminAuditLog")));
  await denied("read weeklyChallenges", () => getDocs(collection(db, "weeklyChallenges")));
  await denied("read announcements", () => getDocs(collection(db, "announcements")));
  await denied("read badges", () => getDocs(collection(db, "badges")));

  console.log("\n-- public site must NOT be writable --");
  await denied("create an event", () => setDoc(doc(db, "siteEvents/__attack"), { title: "PWNED", description: "", dateLabel: "", location: null, imageUrl: null, order: 0, published: true }));
  await denied("deface an existing event", () => updateDoc(doc(db, "siteEvents/seed-weekly-contest"), { title: "PWNED" }));
  await denied("delete an event", () => deleteDoc(doc(db, "siteEvents/seed-weekly-contest")));
  await denied("create a board member", () => setDoc(doc(db, "boardMembers/__attack"), { name: "PWNED", title: "x", imageUrl: null, linkUrl: null, order: 0, published: true }));
  await denied("create a blog post", () => setDoc(doc(db, "blogPosts/__attack"), { title: "PWNED", category: "news", status: "published", body: "x" }));
  await denied("delete a blog post", () => deleteDoc(doc(db, "blogPosts/seed-welcome")));

  console.log("\n-- score / identity tampering --");
  await denied("grant myself XP on a real user", () => updateDoc(doc(db, "users/rWaUP1lw7adylKN7jl52KzQ8iJ52"), { xp: 999999 }));
  await denied("promote a real user to super_admin", () => updateDoc(doc(db, "users/rWaUP1lw7adylKN7jl52KzQ8iJ52"), { role: "super_admin" }));
  await denied("create an account with admin role", () => setDoc(doc(db, "users/__attacker"), { uid: "__attacker", role: "admin", xp: 0, level: 1 }));
  await denied("forge a pointsLog award", () => setDoc(doc(db, "pointsLog/__attack"), { logId: "__attack", uid: "rWaUP1lw7adylKN7jl52KzQ8iJ52", xpAwarded: 99999 }));
  await denied("forge a leaderboard snapshot", () => setDoc(doc(db, "leaderboardSnapshots/__attack"), { snapshotId: "__attack", week: "2026-W31" }));
  await denied("write an audit entry", () => setDoc(doc(db, "adminAuditLog/__attack"), { logId: "__attack", actorUid: "x", action: "role.change", detail: "x" }));
  await denied("create a challenge", () => setDoc(doc(db, "weeklyChallenges/__attack"), { week: "2026-W31", tier: "easy", title: "x", problemUrl: null, requiredCount: 1, points: 1, xp: 9999, createdBy: "x" }));
  await denied("post an announcement", () => setDoc(doc(db, "announcements/__attack"), { title: "PWNED", body: "x", postedBy: "x" }));

  console.log("\n-- denial of service / abuse --");
  const big = "data:image/jpeg;base64," + "A".repeat(900_000);
  await denied("write a 900KB image into public content", () => setDoc(doc(db, "siteEvents/__big"), { title: "x", description: "", dateLabel: "", location: null, imageUrl: big, order: 0, published: true }));

  console.log(`\n${"=".repeat(58)}`);
  console.log(`LIVE ANONYMOUS SUITE: ${pass} passed, ${fail} failed`);
  if (findings.length) { console.log("\nCRITICAL — these succeeded and must not have:"); findings.forEach(f => console.log(`  * ${f}`)); }
  console.log("=".repeat(58));
  process.exit(fail === 0 ? 0 : 1);
}
main();
