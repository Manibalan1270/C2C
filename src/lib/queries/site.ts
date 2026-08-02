/**
 * Reads and writes for the PUBLIC site content — Events, Board Members and
 * Blog posts on the marketing page.
 *
 * These are the only queries in the app that run for logged-out visitors, so
 * the read paths must not touch anything that needs auth. In particular the
 * public lists never join against `users`: an anonymous visitor can't read
 * that collection, and a join would turn the whole section into a silent
 * permission error. Anything the public needs to see is denormalised onto the
 * document at write time (see `authorName`).
 */
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
  updateDoc,
  where,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  COLLECTIONS,
  MAX_INLINE_IMAGE_BYTES,
  type BlogPostDoc,
  type BoardMemberDoc,
  type SiteEventDoc,
} from "../../types/schema";
import { recordAudit, type Actor } from "./admin";

/**
 * Last line of defence before an oversized image reaches Firestore.
 *
 * The cropper already compresses to fit and the security rules reject
 * anything over the cap, but a rules rejection surfaces as a generic
 * "permission denied" that looks like a login problem rather than an image
 * problem. Failing here means the admin gets told what's actually wrong.
 */
function assertImageFits(imageUrl: string | null, label: string) {
  if (imageUrl && imageUrl.length > MAX_INLINE_IMAGE_BYTES) {
    const kb = Math.round(imageUrl.length / 1000);
    const capKb = Math.round(MAX_INLINE_IMAGE_BYTES / 1000);
    throw new Error(
      `That ${label} image is ${kb}KB, over the ${capKb}KB limit. ` +
        `Crop it smaller or pick a less detailed photo.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface SiteEventInput {
  title: string;
  description: string;
  dateLabel: string;
  startDate: string | null;
  location: string | null;
  imageUrl: string | null;
  order: number;
  published: boolean;
}

/** Today in the club's timezone as "YYYY-MM-DD", for comparing against
 *  `startDate`. Local time is correct here — a college event is "on the 12th"
 *  for the people attending it, not at some UTC instant. */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True once the day of the event has passed. Undated events never expire. */
export function isPastEvent(event: Pick<SiteEventDoc, "startDate">): boolean {
  return event.startDate != null && event.startDate < todayIso();
}

/**
 * Public read — published, not yet past, editorial order.
 *
 * Expiry is applied in JS rather than in the query. Firestore can't combine an
 * inequality on `startDate` with the ordering on `order` without making
 * `startDate` the first sort key, which would throw away the manual ordering
 * that is the entire point of the field. The list is capped at a couple of
 * dozen documents, so filtering client-side costs nothing.
 */
export async function fetchPublishedEvents(max = 12): Promise<SiteEventDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.siteEvents),
      where("published", "==", true),
      orderBy("order", "asc"),
      // Over-fetch, because some of these get dropped as past events below.
      fbLimit(max * 3),
    ),
  );
  return snap.docs
    .map((d) => d.data() as SiteEventDoc)
    .filter((e) => !isPastEvent(e))
    .slice(0, max);
}

/** Admin read — drafts included. */
export async function fetchAllEvents(max = 50): Promise<SiteEventDoc[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.siteEvents), orderBy("order", "asc"), fbLimit(max)),
  );
  return snap.docs.map((d) => d.data() as SiteEventDoc);
}

export async function createEvent(
  actor: Actor,
  input: SiteEventInput,
): Promise<string> {
  assertImageFits(input.imageUrl, "event");
  const ref = doc(collection(db, COLLECTIONS.siteEvents));
  const body: WithFieldValue<SiteEventDoc> = {
    eventId: ref.id,
    ...input,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  await recordAudit(actor, "event.create", `added event "${input.title}"`, {
    uid: null,
    label: ref.id,
  });
  return ref.id;
}

export async function updateEvent(
  actor: Actor,
  eventId: string,
  input: SiteEventInput,
): Promise<void> {
  assertImageFits(input.imageUrl, "event");
  await updateDoc(doc(db, COLLECTIONS.siteEvents, eventId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "event.update", `edited event "${input.title}"`, {
    uid: null,
    label: eventId,
  });
}

export async function deleteEvent(actor: Actor, event: SiteEventDoc): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.siteEvents, event.eventId));
  await recordAudit(actor, "event.delete", `deleted event "${event.title}"`, {
    uid: null,
    label: event.eventId,
  });
}

// ---------------------------------------------------------------------------
// Board members
// ---------------------------------------------------------------------------

export interface BoardMemberInput {
  name: string;
  title: string;
  imageUrl: string | null;
  linkUrl: string | null;
  order: number;
  published: boolean;
}

export async function fetchPublishedBoardMembers(
  max = 30,
): Promise<BoardMemberDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.boardMembers),
      where("published", "==", true),
      orderBy("order", "asc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as BoardMemberDoc);
}

export async function fetchAllBoardMembers(max = 60): Promise<BoardMemberDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.boardMembers),
      orderBy("order", "asc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as BoardMemberDoc);
}

export async function createBoardMember(
  actor: Actor,
  input: BoardMemberInput,
): Promise<string> {
  assertImageFits(input.imageUrl, "board member");
  const ref = doc(collection(db, COLLECTIONS.boardMembers));
  const body: WithFieldValue<BoardMemberDoc> = {
    memberId: ref.id,
    ...input,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  await recordAudit(actor, "board.create", `added board member "${input.name}"`, {
    uid: null,
    label: ref.id,
  });
  return ref.id;
}

export async function updateBoardMember(
  actor: Actor,
  memberId: string,
  input: BoardMemberInput,
): Promise<void> {
  assertImageFits(input.imageUrl, "board member");
  await updateDoc(doc(db, COLLECTIONS.boardMembers, memberId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "board.update", `edited board member "${input.name}"`, {
    uid: null,
    label: memberId,
  });
}

export async function deleteBoardMember(
  actor: Actor,
  member: BoardMemberDoc,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.boardMembers, member.memberId));
  await recordAudit(actor, "board.delete", `removed board member "${member.name}"`, {
    uid: null,
    label: member.memberId,
  });
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export interface BlogPostInput {
  title: string;
  category: BlogPostDoc["category"];
  status: BlogPostDoc["status"];
  body: string;
}

export async function fetchPublishedPosts(max = 12): Promise<BlogPostDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.blogPosts),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as BlogPostDoc);
}

/**
 * One post by id, for the public detail page.
 *
 * Returns null for a missing document rather than throwing, so the page can
 * tell "no such post" (render a 404) apart from "the read failed" (render an
 * error) — those want different screens and a thrown error collapses them.
 */
export async function fetchPost(postId: string): Promise<BlogPostDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.blogPosts, postId));
  return snap.exists() ? (snap.data() as BlogPostDoc) : null;
}

export async function fetchAllPosts(max = 50): Promise<BlogPostDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.blogPosts),
      orderBy("createdAt", "desc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as BlogPostDoc);
}

export async function createPost(actor: Actor, input: BlogPostInput): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.blogPosts));
  const body: WithFieldValue<BlogPostDoc> = {
    postId: ref.id,
    ...input,
    author: actor.uid,
    // Denormalised so the public page can show a byline without reading
    // `users`, which anonymous visitors are not permitted to do.
    authorName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  await recordAudit(actor, "post.create", `wrote "${input.title}"`, {
    uid: null,
    label: ref.id,
  });
  return ref.id;
}

export async function updatePost(
  actor: Actor,
  postId: string,
  input: BlogPostInput,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.blogPosts, postId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
  await recordAudit(actor, "post.update", `edited "${input.title}"`, {
    uid: null,
    label: postId,
  });
}

export async function deletePost(actor: Actor, post: BlogPostDoc): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.blogPosts, post.postId));
  await recordAudit(actor, "post.delete", `deleted "${post.title}"`, {
    uid: null,
    label: post.postId,
  });
}
