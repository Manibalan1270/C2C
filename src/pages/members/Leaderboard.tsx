import { useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import { useLeaderboard, type LeaderboardScope } from "../../hooks/useLeaderboard";
import type { LeaderboardRow } from "../../lib/queries/users";

/**
 * Ranked list of members.
 *
 * A plain list rather than the bar chart this used to be. A bar's length
 * encodes magnitude, but on a leaderboard the magnitude is nearly identical
 * between adjacent rows — the top five differ by a couple of percent — so the
 * bars were all the same length and encoded nothing. Rank order and the XP
 * figure are the information; the row just has to make them scannable.
 */

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "allTime", label: "All Time" },
];

/**
 * Deterministic avatar tint from the uid, so a member keeps the same colour
 * across sessions and devices without anything being stored.
 */
function avatarHue(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ row }: { row: LeaderboardRow }) {
  const hue = avatarHue(row.uid);
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-tech text-xs font-semibold"
      style={{
        // Fixed lightness/chroma so every avatar carries the same weight —
        // only the hue varies, which keeps the column calm at 25 rows.
        backgroundColor: `oklch(0.45 0.09 ${hue})`,
        color: "#f4f4f5",
      }}
    >
      {initialsOf(row.name)}
    </span>
  );
}

function Row({ row, isSelf }: { row: LeaderboardRow; isSelf: boolean }) {
  return (
    <li
      className={[
        "flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors",
        isSelf ? "bg-galaxy-accent/10" : "hover:bg-galaxy-surface-hover",
      ].join(" ")}
    >
      <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-galaxy-muted">
        {row.rank}
      </span>

      <Avatar row={row} />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-galaxy-text">
            {row.name}
          </span>
          {isSelf && (
            <span className="shrink-0 rounded-full bg-galaxy-accent px-1.5 py-0.5 font-tech text-[0.6rem] font-semibold uppercase tracking-wide text-galaxy-on-accent">
              You
            </span>
          )}
        </span>
        {row.handle && (
          <span className="mt-0.5 block truncate font-mono text-xs text-galaxy-muted">
            @{row.handle}
          </span>
        )}
      </span>

      <span className="shrink-0 font-mono text-sm tabular-nums text-galaxy-muted">
        {row.xp.toLocaleString()} XP
      </span>
    </li>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>("allTime");
  const { entries, selfEntry, selfInList, week, awaitingFirstSnapshot, loading } =
    useLeaderboard(scope);

  const leader = entries[0];
  const gap = selfEntry && leader ? leader.xp - selfEntry.xp : 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-tech text-2xl font-semibold tracking-tight">Leaderboards</h1>
        <p className="mt-1 text-sm text-galaxy-muted">
          Compete with other members and rise to the top.
          {gap > 0 && (
            <>
              {" "}
              You're{" "}
              <span className="font-mono tabular-nums text-galaxy-text">
                {gap.toLocaleString()}
              </span>{" "}
              XP behind first.
            </>
          )}
        </p>
      </header>

      {/* Underlined tabs on a full-width rule, matching the rest of the app's
          navigation rather than introducing a third selected-state style. */}
      <div
        role="tablist"
        aria-label="Leaderboard range"
        className="flex gap-6 border-b border-galaxy-line"
      >
        {SCOPES.map(({ id, label }) => {
          const active = scope === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setScope(id)}
              className={[
                "relative -mb-px px-1 py-3 font-tech text-sm font-medium transition-colors",
                active
                  ? "text-galaxy-text"
                  : "text-galaxy-muted hover:text-galaxy-text",
              ].join(" ")}
            >
              {label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-galaxy-accent"
                />
              )}
            </button>
          );
        })}
      </div>

      {week && (
        <p className="-mt-2 font-mono text-xs text-galaxy-dim">Week {week}</p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-galaxy-muted">Loading…</p>
      ) : awaitingFirstSnapshot ? (
        <p className="py-10 text-center text-sm text-galaxy-muted">
          No weekly snapshot yet — the first one is written after a full week of
          syncing. All Time is live in the meantime.
        </p>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-galaxy-muted">
          No members ranked yet.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {entries.map((row) => (
            <Row key={row.uid} row={row} isSelf={row.uid === user?.uid} />
          ))}

          {/* Outside the top N — separated so the rank jump is obvious rather
              than looking like the list simply continues. */}
          {selfEntry && !selfInList && (
            <>
              <li aria-hidden="true" className="py-2 text-center text-galaxy-dim">
                ···
              </li>
              <Row row={selfEntry} isSelf />
            </>
          )}
        </ul>
      )}
    </div>
  );
}
