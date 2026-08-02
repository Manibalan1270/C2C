import { useAsync } from "./useAsync";
import { fetchAnnouncements } from "../lib/queries/announcements";
import type { AnnouncementDoc } from "../types/schema";

/**
 * Club announcements, newest first.
 *
 * Lives here rather than in useAdminData because it is not an admin concern —
 * admins write announcements, but MEMBERS are the audience. It sat in the
 * admin module and was imported by exactly one admin screen, which is how the
 * feature ended up write-only: they could be posted and managed, and no member
 * ever saw one.
 */
export function useAnnouncements(max = 5) {
  const { data, loading, error, reload } = useAsync<AnnouncementDoc[]>(
    () => fetchAnnouncements(max),
    [max],
  );
  return { announcements: data ?? [], loading, error, reload };
}
