import {
  PiClockCountdownDuotone,
  PiGaugeDuotone,
  PiUsersDuotone,
  PiWarningDuotone,
} from "react-icons/pi";
import { useAdminMembers, useAuditLog } from "../../../hooks/useAdminData";
import { useWeeklyChallenges } from "../../../hooks/useWeeklyChallenges";
import { isoWeekKey } from "../../../lib/week";
import Panel from "../../../components/members/Panel";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-galaxy-muted">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-galaxy-muted">{sub}</p>}
    </div>
  );
}

function timeAgo(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminOverview() {
  const { members, loading: membersLoading } = useAdminMembers();
  const { entries, loading: auditLoading } = useAuditLog(8);
  const { week, challenges } = useWeeklyChallenges();

  const linked = members.filter(
    (m) => m.leetcodeUsername != null || m.hackerrankUsername != null,
  );
  const withSyncErrors = members.filter((m) => m.lastSyncError);
  const admins = members.filter((m) => m.role === "admin" || m.role === "super_admin");
  const thisWeek = isoWeekKey();

  // The most recent successful sync across all members — the practical
  // answer to "is the engine actually running?"
  const lastSync = members
    .map((m) => m.lastSyncedAt?.toMillis?.() ?? 0)
    .reduce((max, t) => Math.max(max, t), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Members" icon={PiUsersDuotone}>
          <Stat
            label="Total"
            value={membersLoading ? "—" : String(members.length)}
            sub={`${linked.length} linked · ${admins.length} admin`}
          />
        </Panel>

        <Panel title="This week" icon={PiGaugeDuotone}>
          <Stat
            label={thisWeek}
            value={String(challenges.filter((c) => c.week === thisWeek).length)}
            sub={
              week === thisWeek
                ? "challenges posted"
                : week
                  ? `nothing posted yet — showing ${week}`
                  : "no challenges yet"
            }
          />
        </Panel>

        <Panel title="Last sync" icon={PiClockCountdownDuotone}>
          <Stat
            label="Engine"
            value={lastSync > 0 ? timeAgo(lastSync) : "never"}
            sub={
              lastSync > 0
                ? "most recent member sync"
                : "run the sync workflow to populate"
            }
          />
        </Panel>

        <Panel title="Sync errors" icon={PiWarningDuotone}>
          <Stat
            label="Members affected"
            value={membersLoading ? "—" : String(withSyncErrors.length)}
            sub={
              withSyncErrors.length > 0
                ? "usually a mistyped username"
                : "all linked accounts reading cleanly"
            }
          />
        </Panel>
      </div>

      {withSyncErrors.length > 0 && (
        <Panel title="Members needing attention" icon={PiWarningDuotone}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {withSyncErrors.map((m) => (
              <li
                key={m.uid}
                className="rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2"
              >
                <p className="text-sm font-medium">{m.name}</p>
                <p className="mt-0.5 text-xs text-galaxy-muted">{m.lastSyncError}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Recent admin activity">
        {auditLoading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            Nothing logged yet. Role changes, XP adjustments and badge grants all
            appear here.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {entries.map((e) => (
              <li
                key={e.logId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2"
              >
                <span className="text-sm">
                  <span className="font-medium">{e.actorName}</span>{" "}
                  <span className="text-galaxy-muted">{e.detail}</span>
                  {e.targetLabel && (
                    <span className="text-galaxy-muted"> · {e.targetLabel}</span>
                  )}
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-galaxy-muted">
                  {e.action}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
