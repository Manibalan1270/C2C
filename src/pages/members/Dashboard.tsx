import {
  PiCaretDownBold,
  PiCaretUpBold,
  PiChartBarDuotone,
  PiFireDuotone,
  PiMegaphoneDuotone,
  PiMinusBold,
  PiRankingDuotone,
  PiSparkleDuotone,
  PiTargetDuotone,
} from "react-icons/pi";
import type { AnnouncementDoc } from "../../types/schema";
import { useAuth } from "../../lib/AuthContext";
import { useMemberStats } from "../../hooks/useMemberStats";
import { useWeeklyChallenges } from "../../hooks/useWeeklyChallenges";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import { levelForXp, xpIntoLevel, XP_PER_LEVEL } from "../../lib/gamification";
import Panel from "../../components/members/Panel";
import SyncStatus from "../../components/members/SyncStatus";
import Meter from "../../components/members/charts/Meter";
import ColumnChart from "../../components/members/charts/ColumnChart";
import Sparkline from "../../components/members/charts/Sparkline";
import {
  GOOD,
  BAD,
  NEUTRAL,
  MARK,
  XP_MARK,
} from "../../components/members/charts/chartTokens";

const DIRECTION = {
  up: { Icon: PiCaretUpBold, color: GOOD, word: "up" },
  down: { Icon: PiCaretDownBold, color: BAD, word: "down" },
  same: { Icon: PiMinusBold, color: NEUTRAL, word: "no change" },
} as const;

function StatValue({ children }: { children: React.ReactNode }) {
  // Proportional figures on purpose — tabular-nums looks loose at display size.
  return <p className="mt-1 text-3xl font-semibold leading-none">{children}</p>;
}

/**
 * When an announcement was posted, relative.
 *
 * `postedAt` is a serverTimestamp sentinel until the write round-trips, so it
 * is legitimately absent on one that was just created — "just now" is the
 * honest answer there, not a missing date.
 */
function postedAgo(a: AnnouncementDoc): string {
  const ms = a.postedAt?.toMillis?.();
  if (!ms) return "just now";
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Dashboard() {
  const { user, userDoc, docLoading } = useAuth();
  const { stats, loading: statsLoading } = useMemberStats();
  const { goal } = useWeeklyChallenges();
  const { announcements } = useAnnouncements();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const xp = userDoc?.xp ?? 0;
  const currentStreak = userDoc?.currentStreak ?? 0;
  const bestStreak = userDoc?.bestStreak ?? 0;
  const dir = DIRECTION[stats?.rankDirection ?? "same"];

  const goalCompleted = stats?.weeklySolvedCount ?? 0;
  const dailySolved = stats?.dailySolved ?? [];
  const solvedThisFortnight = dailySolved.reduce((sum, d) => sum + d.count, 0);
  const rankValues = stats?.rankHistory.map((r) => r.rank) ?? [];
  const hasRankHistory = rankValues.length >= 2;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-tech text-[0.7rem] uppercase tracking-[0.24em] text-galaxy-accent-text">
          Dashboard
        </p>
        <h1 className="mt-2 font-tech text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <SyncStatus className="mt-2" />
      </header>

      {/* KPI row — four headline numbers, each with the context it needs. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Weekly goal" icon={PiTargetDuotone}>
          <StatValue>
            {docLoading || statsLoading ? "—" : goalCompleted}
            <span className="text-lg font-normal text-galaxy-muted">
              {" "}
              / {goal.target}
            </span>
          </StatValue>
          <div className="mt-4">
            <Meter
              value={goalCompleted}
              max={goal.target}
              color={MARK}
              label={goal.label}
            />
          </div>
          <p className="mt-2 text-xs text-galaxy-muted">{goal.label}</p>
        </Panel>

        <Panel title="Level" icon={PiSparkleDuotone}>
          <StatValue>
            <span style={{ color: XP_MARK }}>
              {docLoading ? "—" : levelForXp(xp)}
            </span>
          </StatValue>
          <div className="mt-4">
            <Meter
              value={xpIntoLevel(xp)}
              max={XP_PER_LEVEL}
              color={XP_MARK}
              label={`${xpIntoLevel(xp)} of ${XP_PER_LEVEL} XP toward level ${levelForXp(xp) + 1}`}
            />
          </div>
          <p className="mt-2 font-mono text-xs tabular-nums text-galaxy-muted">
            {xpIntoLevel(xp)} / {XP_PER_LEVEL} XP to level {levelForXp(xp) + 1}
          </p>
        </Panel>

        <Panel title="Leaderboard rank" icon={PiRankingDuotone}>
          <div className="flex items-baseline gap-2">
            <StatValue>
              {statsLoading ? "—" : stats?.rank != null ? `#${stats.rank}` : "—"}
            </StatValue>
            {/* Icon + word, so direction never rests on colour alone. */}
            {stats?.rank != null && (stats.rankDelta !== 0 || stats.rankDirection !== "same") && (
              <span
                className="flex items-center gap-0.5 font-mono text-xs tabular-nums"
                style={{ color: dir.color }}
              >
                <dir.Icon className="h-3 w-3" />
                {stats.rankDelta}
              </span>
            )}
          </div>
          <div className="mt-3">
            {hasRankHistory ? (
              <Sparkline
                values={rankValues}
                invert
                label="Leaderboard rank over recent weeks"
              />
            ) : (
              <p className="py-2 text-xs text-galaxy-muted">
                Ranked after the first weekly snapshot.
              </p>
            )}
          </div>
          {stats?.rank != null && (stats.rankDelta !== 0 || stats.rankDirection !== "same") && (
            <p className="mt-1 text-xs text-galaxy-muted">
              Moved {dir.word} {stats.rankDelta} since last week
            </p>
          )}
        </Panel>

        <Panel title="Current streak" icon={PiFireDuotone}>
          <StatValue>
            {docLoading ? "—" : currentStreak}
            <span className="text-lg font-normal text-galaxy-muted"> days</span>
          </StatValue>
          <div className="mt-4">
            <Meter
              value={currentStreak}
              // A brand-new member has bestStreak === 0; dividing by that
              // would be a divide-by-zero in the meter's percentage math.
              max={Math.max(1, bestStreak)}
              color={MARK}
              label={`Current streak ${currentStreak} days, personal best ${bestStreak}`}
            />
          </div>
          <p className="mt-2 font-mono text-xs tabular-nums text-galaxy-muted">
            Personal best {bestStreak} days
          </p>
        </Panel>
      </div>

      {/* Above Activity on purpose. An announcement is time-sensitive news the
          club is trying to tell everyone — burying it under a chart the member
          has already seen would defeat the point of posting one. It renders
          only when there is something to say, so the Dashboard doesn't carry a
          permanent empty box. */}
      {announcements.length > 0 && (
        <Panel title="Announcements" icon={PiMegaphoneDuotone}>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {announcements.map((a) => (
              <li
                key={a.announcementId}
                className="rounded-xl border border-galaxy-line bg-galaxy-deep p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="font-mono text-[0.65rem] text-galaxy-dim">
                    {postedAgo(a)}
                  </p>
                </div>
                {/* whitespace-pre-wrap: admins type these in a textarea and
                    their paragraph breaks are meaningful. */}
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-galaxy-muted">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Activity"
        icon={PiChartBarDuotone}
        action={
          <span className="font-mono text-xs tabular-nums text-galaxy-muted">
            {statsLoading ? "…" : `${solvedThisFortnight} solved`}
          </span>
        }
      >
        {dailySolved.length > 0 ? (
          <>
            <ColumnChart data={dailySolved} />
            {solvedThisFortnight === 0 && (
              <p className="mt-3 text-center text-sm text-galaxy-muted">
                No solved problems yet — link an account on your profile.
              </p>
            )}
          </>
        ) : !statsLoading ? (
          <p className="py-6 text-center text-sm text-galaxy-muted">
            No activity yet — link a coding account on your profile to get started.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
