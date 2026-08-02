/**
 * Verification logic against real accounts. No credentials needed — it only
 * hits the public endpoints, same as the readers it wraps.
 */
import { verifyPlatformHandle } from "../lib/platforms/verify";

const CASES: { p: "leetcode" | "hackerrank"; u: string; expect: string }[] = [
  { p: "leetcode", u: "lee215", expect: "verified + history public" },
  { p: "leetcode", u: "neal_wu", expect: "verified + history PRIVATE" },
  { p: "leetcode", u: "zc3n7ZQbPC", expect: "verified (the club admin)" },
  { p: "leetcode", u: "zzz-not-a-real-user-99999", expect: "NOT verified" },
  { p: "hackerrank", u: "shashank21j", expect: "verified, has badges" },
  { p: "hackerrank", u: "tourist", expect: "verified, ZERO badges" },
  { p: "hackerrank", u: "zzz-not-a-real-user-99999", expect: "NOT verified" },
];

async function main() {
  let bad = 0;
  for (const c of CASES) {
    const r = await verifyPlatformHandle(c.p, c.u);
    const badge = r.verified ? "VERIFIED  " : "unverified";
    const hist = !r.verified ? "-" : r.detailsPublic ? "public " : "PRIVATE";
    console.log(
      `${c.p.padEnd(11)} ${c.u.padEnd(26)} ${badge} history=${hist} ${(r.detail || r.error || "").slice(0, 46)}`,
    );
    console.log(`${" ".repeat(12)}expected: ${c.expect}`);
    if (c.expect.startsWith("NOT") && r.verified) bad++;
    if (!c.expect.startsWith("NOT") && !r.verified) bad++;
    await new Promise((r) => setTimeout(r, 1300));
  }
  console.log(bad === 0 ? "\nAll verification cases behaved as expected." : `\n${bad} MISMATCH`);
  process.exit(bad === 0 ? 0 : 1);
}
main();
