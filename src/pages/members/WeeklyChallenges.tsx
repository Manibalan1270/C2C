import {
  PiArrowSquareOutBold,
  PiCheckCircleDuotone,
  PiLightningDuotone,
} from "react-icons/pi";
import type { ChallengeTier } from "../../types/schema";
import { useWeeklyChallenges } from "../../hooks/useWeeklyChallenges";
import Panel from "../../components/members/Panel";
import { ORDINAL, MARK } from "../../components/members/charts/chartTokens";

/**
 * Tier colour follows the same ordinal ramp as the difficulty chart on the
 * Profile page, so "hard" looks the same everywhere. Surprise sits outside
 * the ramp because it isn't a difficulty step.
 */
const TIER_COLOR: Record<ChallengeTier, string> = {
  easy: ORDINAL[0],
  medium: ORDINAL[1],
  hard: ORDINAL[2],
  surprise: MARK,
};

export default function WeeklyChallenges() {
  const { week, challenges, goal, completedIds, loading } = useWeeklyChallenges();
  const totalXp = challenges.reduce((s, c) => s + c.xp, 0);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-tech text-[0.7rem] uppercase tracking-[0.24em] text-galaxy-accent-text">
          Weekly Challenges
        </p>
        <h1 className="mt-2 font-tech text-2xl font-semibold tracking-tight">
          {loading ? "Loading…" : week ? `Week ${week}` : "No challenges yet"}
        </h1>
        <p className="mt-1 text-sm text-galaxy-muted">
          {challenges.length > 0 ? (
            <>
              Clear all {challenges.length} for{" "}
              <span className="font-mono tabular-nums text-galaxy-text">
                {totalXp}
              </span>{" "}
              XP. Goal: {goal.label}.
            </>
          ) : !loading ? (
            "Check back Monday for this week's set."
          ) : null}
        </p>
      </header>

      <Panel title="This week's set" icon={PiLightningDuotone}>
        {challenges.length === 0 && !loading ? (
          <p className="py-6 text-center text-sm text-galaxy-muted">
            No challenges posted yet.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {challenges.map((c) => {
              const done = completedIds.has(c.challengeId);
              return (
              <li
                key={c.challengeId}
                className={[
                  "flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
                  done
                    ? "border-[var(--chart-good)]/40 bg-[var(--chart-good)]/8"
                    : "border-galaxy-line bg-galaxy-deep hover:border-galaxy-dim",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  {/* Colour carries the tier, but the word is always present. */}
                  <span
                    aria-hidden="true"
                    className="mt-1 h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: TIER_COLOR[c.tier] }}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-galaxy-muted">
                      {c.tier}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">{c.title}</p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-galaxy-muted">
                      {c.points} pts · {c.xp} XP
                    </p>
                  </div>
                </div>

                {done ? (
                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 font-tech text-xs font-semibold tracking-wide"
                    style={{
                      color: "var(--chart-good)",
                      backgroundColor: "color-mix(in oklab, var(--chart-good) 14%, transparent)",
                    }}
                  >
                    {/* Icon plus the word — colour alone never carries state. */}
                    <PiCheckCircleDuotone className="h-4 w-4" />
                    Solved
                  </span>
                ) : c.problemUrl ? (
                  <a
                    href={c.problemUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-galaxy-cta px-4 py-1.5 font-tech text-xs font-semibold tracking-wide text-galaxy-on-cta transition hover:opacity-90"
                  >
                    Solve
                    <PiArrowSquareOutBold className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="shrink-0 rounded-full border border-galaxy-line px-4 py-1.5 text-xs text-galaxy-muted">
                    Details soon
                  </span>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
