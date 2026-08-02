import { useMemo, useState } from "react";
import { PiUsersDuotone, PiWarningDuotone } from "react-icons/pi";
import { useAuth } from "../../../lib/AuthContext";
import { useActor, useAdminMembers, useBadgeDefinitions } from "../../../hooks/useAdminData";
import {
  changeRole,
  grantBadge,
  revokeBadge,
  setXp,
  unlinkPlatform,
} from "../../../lib/queries/admin";
import { levelForXp } from "../../../lib/gamification";
import Panel from "../../../components/members/Panel";
import type { UserDoc, UserRole } from "../../../types/schema";

const ROLES: UserRole[] = ["guest", "member", "mentor", "admin", "super_admin"];

const inputClass =
  "rounded-lg border border-galaxy-line bg-galaxy-deep px-2.5 py-1.5 text-sm text-galaxy-text focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

function MemberRow({
  member,
  badgeIds,
  isSelf,
  canMintSuperAdmin,
  onDone,
}: {
  member: UserDoc;
  badgeIds: string[];
  isSelf: boolean;
  canMintSuperAdmin: boolean;
  onDone: () => void;
}) {
  const actor = useActor();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpDraft, setXpDraft] = useState(String(member.xp));

  async function run(fn: () => Promise<void>) {
    if (!actor) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "permission-denied"
          ? "Denied by security rules — you may not have permission for that change."
          : "That didn't save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-galaxy-line bg-galaxy-deep p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {member.name}
            {isSelf && (
              <span className="rounded-full border border-galaxy-line px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-galaxy-muted">
                you
              </span>
            )}
            {member.lastSyncError && (
              <PiWarningDuotone
                className="h-4 w-4 text-amber-400"
                title={member.lastSyncError}
              />
            )}
          </p>
          <p className="truncate text-xs text-galaxy-muted">{member.email}</p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-galaxy-muted">
          <span>{member.xp.toLocaleString()} XP</span>
          <span>L{member.level}</span>
          <span className="rounded-full border border-galaxy-line px-2 py-0.5 uppercase tracking-wider">
            {member.role}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-galaxy-line px-3 py-1 text-galaxy-muted transition hover:border-galaxy-dim hover:text-galaxy-text"
          >
            {open ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-galaxy-line pt-3">
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-xs text-galaxy-muted">Role</span>
            <select
              value={member.role}
              disabled={busy}
              onChange={(e) =>
                run(() => changeRole(actor!, member, e.target.value as UserRole))
              }
              className={inputClass}
            >
              {ROLES.map((role) => (
                <option
                  key={role}
                  value={role}
                  // Minting a super_admin is reserved to super_admins; the
                  // rules enforce it too, this just avoids a pointless
                  // round-trip to be told no.
                  disabled={role === "super_admin" && !canMintSuperAdmin}
                >
                  {role}
                </option>
              ))}
            </select>
            {isSelf && (
              <span className="text-xs text-amber-400">
                Careful — demoting yourself removes your own admin access.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-xs text-galaxy-muted">XP</span>
            <input
              type="number"
              min={0}
              max={1000000}
              value={xpDraft}
              disabled={busy}
              onChange={(e) => setXpDraft(e.target.value)}
              className={`${inputClass} w-32`}
            />
            <button
              type="button"
              disabled={busy || Number(xpDraft) === member.xp}
              onClick={() => run(() => setXp(actor!, member, Number(xpDraft)))}
              className="rounded-full bg-galaxy-cta px-3 py-1.5 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-50"
            >
              Set XP
            </button>
            <span className="text-xs text-galaxy-muted">
              → level {levelForXp(Number(xpDraft) || 0)}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <span className="w-20 shrink-0 pt-1 text-xs text-galaxy-muted">Accounts</span>
            <div className="flex flex-wrap gap-2">
              {member.leetcodeUsername ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => unlinkPlatform(actor!, member, "leetcode"))}
                  className="rounded-full border border-galaxy-line px-3 py-1 text-xs text-galaxy-muted transition hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
                >
                  Unlink LeetCode (@{member.leetcodeUsername})
                </button>
              ) : (
                <span className="text-xs text-galaxy-muted">LeetCode not linked</span>
              )}
              {member.hackerrankUsername ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => unlinkPlatform(actor!, member, "hackerrank"))}
                  className="rounded-full border border-galaxy-line px-3 py-1 text-xs text-galaxy-muted transition hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
                >
                  Unlink HackerRank (@{member.hackerrankUsername})
                </button>
              ) : (
                <span className="text-xs text-galaxy-muted">HackerRank not linked</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <span className="w-20 shrink-0 pt-1 text-xs text-galaxy-muted">Badges</span>
            <div className="flex flex-wrap gap-1.5">
              {badgeIds.length === 0 && (
                <span className="text-xs text-galaxy-muted">
                  No badge definitions seeded yet.
                </span>
              )}
              {badgeIds.map((id) => {
                const held = (member.badgeIds ?? []).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        held ? revokeBadge(actor!, member, id) : grantBadge(actor!, member, id),
                      )
                    }
                    className={[
                      "rounded-full px-2.5 py-1 text-xs transition disabled:opacity-50",
                      held
                        ? "bg-galaxy-accent/20 text-galaxy-accent-text ring-1 ring-inset ring-galaxy-accent/40"
                        : "border border-galaxy-line text-galaxy-muted hover:text-galaxy-text",
                    ].join(" ")}
                    title={held ? "Click to revoke" : "Click to grant"}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </div>

          {member.lastSyncError && (
            <p className="text-xs text-amber-400">Last sync: {member.lastSyncError}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function AdminMembers() {
  const { user, role } = useAuth();
  const { members, loading, reload } = useAdminMembers();
  const { badges } = useBadgeDefinitions();
  const [filter, setFilter] = useState("");

  const badgeIds = useMemo(() => badges.map((b) => b.badgeId), [badges]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [members, filter]);

  return (
    <Panel
      title={`Members (${loading ? "…" : visible.length})`}
      icon={PiUsersDuotone}
      action={
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, email or role"
          className={`${inputClass} w-56`}
        />
      }
    >
      {loading ? (
        <p className="text-sm text-galaxy-muted">Loading members…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-galaxy-muted">No members match that filter.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visible.map((m) => (
            <MemberRow
              key={m.uid}
              member={m}
              badgeIds={badgeIds}
              isSelf={m.uid === user?.uid}
              canMintSuperAdmin={role === "super_admin"}
              onDone={reload}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
