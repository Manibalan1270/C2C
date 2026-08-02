import { useAuth } from "../lib/AuthContext";
import { useAsync } from "./useAsync";
// Announcements are a member-facing feature; the hook lives with the rest of
// them. Re-exported so the admin screen keeps its existing import path.
export { useAnnouncements } from "./useAnnouncements";
import {
  fetchAllMembers,
  fetchAuditLog,
  fetchBadgeDefinitions,
  type Actor,
} from "../lib/queries/admin";
import {
  fetchAllBoardMembers,
  fetchAllEvents,
  fetchAllPosts,
} from "../lib/queries/site";
import type {
  AdminAuditLogDoc,
  BadgeDoc,
  BlogPostDoc,
  BoardMemberDoc,
  SiteEventDoc,
  UserDoc,
} from "../types/schema";

/**
 * The signed-in admin as an audit "actor". Every mutating admin call takes
 * one so the log records who did it, not just that it happened.
 */
export function useActor(): Actor | null {
  const { user, userDoc } = useAuth();
  if (!user) return null;
  return { uid: user.uid, name: userDoc?.name ?? user.displayName ?? user.email ?? user.uid };
}

export function useAdminMembers() {
  const { data, loading, error, reload } = useAsync<UserDoc[]>(() => fetchAllMembers(), []);
  return { members: data ?? [], loading, error, reload };
}

export function useAuditLog(max = 50) {
  const { data, loading, error, reload } = useAsync<AdminAuditLogDoc[]>(
    () => fetchAuditLog(max),
    [max],
  );
  return { entries: data ?? [], loading, error, reload };
}


export function useBadgeDefinitions() {
  const { data, loading, error, reload } = useAsync<BadgeDoc[]>(
    () => fetchBadgeDefinitions(),
    [],
  );
  return { badges: data ?? [], loading, error, reload };
}

// --- Public site content ---------------------------------------------------
// These fetch the UNFILTERED lists (drafts included) — the admin needs to see
// what isn't published yet. The marketing site uses the fetchPublished*
// functions instead.

export function useSiteEvents() {
  const { data, loading, error, reload } = useAsync<SiteEventDoc[]>(
    () => fetchAllEvents(),
    [],
  );
  return { events: data ?? [], loading, error, reload };
}

export function useBoardMembers() {
  const { data, loading, error, reload } = useAsync<BoardMemberDoc[]>(
    () => fetchAllBoardMembers(),
    [],
  );
  return { members: data ?? [], loading, error, reload };
}

export function useBlogPosts() {
  const { data, loading, error, reload } = useAsync<BlogPostDoc[]>(
    () => fetchAllPosts(),
    [],
  );
  return { posts: data ?? [], loading, error, reload };
}
