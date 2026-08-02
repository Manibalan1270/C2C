import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, type BadgeDoc } from "../../types/schema";

let cached: Promise<Record<string, BadgeDoc>> | null = null;

async function load(): Promise<Record<string, BadgeDoc>> {
  const snap = await getDocs(collection(db, COLLECTIONS.badges));
  const out: Record<string, BadgeDoc> = {};
  for (const d of snap.docs) {
    const data = d.data() as BadgeDoc;
    out[data.badgeId] = data;
  }
  return out;
}

/**
 * All badge display metadata, fetched once and memoised at module scope —
 * there are only a handful of badges and they change rarely, so every page
 * that shows a badge sharing one in-flight/cached request beats a
 * per-mount refetch. Call `resetBadgeMetaCache()` after seeding new badges
 * in the same session (e.g. from the admin UI, once that exists) if you
 * need a fresh read without a full page reload.
 */
export function fetchBadgeMeta(): Promise<Record<string, BadgeDoc>> {
  if (!cached) cached = load();
  return cached;
}

export function resetBadgeMetaCache(): void {
  cached = null;
}
