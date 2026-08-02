/**
 * Promote a member to admin. Required because firestore.rules correctly
 * forbids clients from writing their own `role` — this is the only way to
 * create the first admin without hand-editing the Firestore console.
 *
 * Usage: npm run promote -- --email=you@svce.ac.in
 */
import { getAuth } from "firebase-admin/auth";
import { adminApp, adminDb } from "../lib/adminApp";
import { COLLECTIONS, type UserRole } from "../../src/types/schema";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function main() {
  const email = argValue("email");
  const role = (argValue("role") ?? "admin") as UserRole;

  if (!email) {
    throw new Error("Usage: npm run promote -- --email=you@svce.ac.in [--role=admin]");
  }
  if (!["admin", "super_admin"].includes(role)) {
    throw new Error(`--role must be admin or super_admin, got "${role}"`);
  }

  const authUser = await getAuth(adminApp).getUserByEmail(email);
  const ref = adminDb.collection(COLLECTIONS.users).doc(authUser.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error(
      `No users/${authUser.uid} doc yet — sign in through the app once first ` +
        `(that's what creates the profile document), then re-run this script.`,
    );
  }

  await ref.update({ role });
  console.log(`Promoted ${email} (${authUser.uid}) to role="${role}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
