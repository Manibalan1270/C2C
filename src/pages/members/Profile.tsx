import { useCallback } from "react";
import { SiHackerrank, SiLeetcode } from "react-icons/si";
import {
  PiChartDonutDuotone,
  PiEyeSlashDuotone,
  PiLinkSimpleBold,
  PiMedalDuotone,
  PiSparkleDuotone,
} from "react-icons/pi";
import { useAuth } from "../../lib/AuthContext";
import { useProfileBreakdown } from "../../hooks/useProfileBreakdown";
import { useBadgeMeta } from "../../hooks/useBadgeMeta";
import { updatePlatformUsernames } from "../../lib/queries/users";
import { ensureUserDoc } from "../../lib/userDoc";
import { levelForXp, xpIntoLevel, xpToNextLevel, XP_PER_LEVEL } from "../../lib/gamification";
import Panel from "../../components/members/Panel";
import Meter from "../../components/members/charts/Meter";
import BarList, { type BarDatum } from "../../components/members/charts/BarList";
import { ORDINAL, XP_MARK } from "../../components/members/charts/chartTokens";
import LinkAccountRow from "../../components/members/LinkAccountRow";

export default function Profile() {
  const { user, userDoc, role, docLoading } = useAuth();
  const { solvedByDifficulty, total: totalSolved, loading: breakdownLoading } =
    useProfileBreakdown();
  const { meta: badgeMeta } = useBadgeMeta();

  const xp = userDoc?.xp ?? 0;
  const anyLinked =
    userDoc?.leetcodeUsername != null || userDoc?.hackerrankUsername != null;

  const difficultyRows: BarDatum[] = [
    { key: "Easy", label: "Easy", value: solvedByDifficulty.easy, color: ORDINAL[0] },
    { key: "Medium", label: "Medium", value: solvedByDifficulty.medium, color: ORDINAL[1] },
    { key: "Hard", label: "Hard", value: solvedByDifficulty.hard, color: ORDINAL[2] },
  ];

  const savePlatform = useCallback(
    async (field: "leetcodeUsername" | "hackerrankUsername", value: string | null) => {
      if (!user) return;
      try {
        await updatePlatformUsernames(user.uid, { [field]: value });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "not-found") {
          // ensureUserDoc's creation on login can fail silently (see
          // userDoc.ts) — if the profile genuinely doesn't exist yet,
          // create it once and retry the write before giving up.
          await ensureUserDoc(user);
          await updatePlatformUsernames(user.uid, { [field]: value });
          return;
        }
        throw err;
      }
    },
    [user],
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-4">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-14 w-14 rounded-full object-cover ring-1 ring-galaxy-line"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-galaxy-accent to-galaxy-accent-hover" />
        )}
        <div className="min-w-0">
          <h1 className="truncate font-tech text-2xl font-semibold tracking-tight">
            {user?.displayName ?? "Member"}
          </h1>
          <p className="truncate text-sm text-galaxy-muted">{user?.email}</p>
        </div>
        {role && (
          <span className="rounded-full border border-galaxy-accent/40 bg-galaxy-accent/10 px-2.5 py-1 font-tech text-[0.65rem] uppercase tracking-[0.14em] text-galaxy-accent-text">
            {role}
          </span>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Total XP" icon={PiSparkleDuotone}>
          <p className="mt-1 text-3xl font-semibold leading-none" style={{ color: XP_MARK }}>
            {docLoading ? "—" : xp.toLocaleString()}
          </p>
          <div className="mt-4">
            <Meter
              value={xpIntoLevel(xp)}
              max={XP_PER_LEVEL}
              color={XP_MARK}
              label={`${xpIntoLevel(xp)} of ${XP_PER_LEVEL} XP toward the next level`}
            />
          </div>
          <p className="mt-2 font-mono text-xs tabular-nums text-galaxy-muted">
            {docLoading
              ? "Loading…"
              : `Level ${levelForXp(xp)} · ${xpToNextLevel(xp)} XP to go`}
          </p>
        </Panel>

        <Panel
          title="Problems solved"
          icon={PiChartDonutDuotone}
          className="lg:col-span-2"
          action={
            <span className="font-mono text-xs tabular-nums text-galaxy-muted">
              {breakdownLoading ? "…" : `${totalSolved} total`}
            </span>
          }
        >
          {anyLinked ? (
            <BarList
              data={difficultyRows}
              title="Problems solved by difficulty"
            />
          ) : (
            <p className="py-6 text-center text-sm text-galaxy-muted">
              Link a coding account below and your solved problems will show up
              here.
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Linked accounts" icon={PiLinkSimpleBold}>
        <div className="flex flex-col gap-3">
          <LinkAccountRow
            icon={<SiLeetcode />}
            name="LeetCode"
            platform="leetcode"
            username={userDoc?.leetcodeUsername ?? null}
            blurb="Not linked — we'll track your solved problems automatically"
            onSave={(value) => savePlatform("leetcodeUsername", value)}
          />
          <LinkAccountRow
            icon={<SiHackerrank />}
            name="HackerRank"
            platform="hackerrank"
            username={userDoc?.hackerrankUsername ?? null}
            blurb="Not linked — we'll track your badges and submissions"
            onSave={(value) => savePlatform("hackerrankUsername", value)}
          />

          {/*
            Only shown once the sync has actually looked and found the history
            hidden. `undefined` means it hasn't run yet, and warning then would
            be guessing — the member would go change a setting that may already
            be correct.

            Deliberately not styled as an error: XP, streaks and the
            leaderboard all work fine without this. The single thing it costs
            is per-challenge completion, so it says exactly that.
          */}
          {userDoc?.leetcodeUsername && userDoc?.leetcodeHistoryPublic === false && (
            <div className="rounded-xl border border-galaxy-line bg-galaxy-deep p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <PiEyeSlashDuotone className="h-4 w-4 shrink-0 text-galaxy-accent-text" />
                Challenges aren't ticking off?
              </p>
              <p className="mt-2 text-xs leading-relaxed text-galaxy-muted">
                Your LeetCode submission history is private, so we can see{" "}
                <em>how many</em> problems you've solved but not <em>which ones</em>.
                XP and streaks still work — only the weekly challenge checkmarks
                are affected.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-galaxy-muted">
                To fix it, open{" "}
                <a
                  href="https://leetcode.com/profile/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-galaxy-accent-text underline underline-offset-2"
                >
                  LeetCode profile settings
                </a>{" "}
                and turn on the public submission history option. The next sync
                will pick it up.
              </p>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Badges" icon={PiMedalDuotone}>
        {!userDoc || userDoc.badgeIds.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            No badges yet. Solve your first problem to earn one.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {userDoc.badgeIds.map((id) => {
              const meta = badgeMeta[id];
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 rounded-xl border border-galaxy-line bg-galaxy-deep p-4 transition-colors hover:border-galaxy-dim"
                >
                  <PiMedalDuotone className="mt-0.5 h-6 w-6 shrink-0 text-galaxy-accent-text" />
                  <div className="min-w-0">
                    <p className="font-tech text-sm font-medium tracking-wide text-galaxy-text">
                      {meta?.name ?? id}
                    </p>
                    {meta && (
                      <p className="mt-1 text-xs leading-relaxed text-galaxy-muted">
                        {meta.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
