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
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, type AnnouncementDoc } from "../../types/schema";
import { recordAudit, type Actor } from "./admin";

export async function fetchAnnouncements(max = 25): Promise<AnnouncementDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.announcements),
      orderBy("postedAt", "desc"),
      fbLimit(max),
    ),
  );
  return snap.docs.map((d) => d.data() as AnnouncementDoc);
}

export async function createAnnouncement(
  actor: Actor,
  input: { title: string; body: string },
): Promise<string> {
  // Pre-generate the ref so announcementId in the body matches the doc id —
  // the schema duplicates it and addDoc can't do that.
  const ref = doc(collection(db, COLLECTIONS.announcements));
  const body: WithFieldValue<AnnouncementDoc> = {
    announcementId: ref.id,
    title: input.title,
    body: input.body,
    postedBy: actor.uid,
    postedAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  await recordAudit(actor, "announcement.create", `posted "${input.title}"`, {
    uid: null,
    label: ref.id,
  });
  return ref.id;
}

export async function deleteAnnouncement(
  actor: Actor,
  announcement: AnnouncementDoc,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.announcements, announcement.announcementId));
  await recordAudit(actor, "announcement.delete", `deleted "${announcement.title}"`, {
    uid: null,
    label: announcement.announcementId,
  });
}
