import { PiArrowsClockwiseBold } from "react-icons/pi";
import { useAuth } from "../../lib/AuthContext";

/**
 * "Last checked N minutes ago."
 *
 * Exists because the sync is invisible. A member solves a problem, opens the
 * app, sees nothing new, and has no way to tell whether the site is broken or
 * simply hasn't looked yet — those two states rendered identically. Showing
 * when the engine last ran turns "it's not working" into "it hasn't checked
 * yet", which is the difference between a bug report and patience.
 *
 * Deliberately states the cadence too. A number with no expectation attached
 * ("4 minutes ago") still leaves the reader guessing how long to wait.
 */

function relativeMinutes(ms: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function SyncStatus({ className = "" }: { className?: string }) {
  const { userDoc } = useAuth();

  // No linked account means the engine deliberately skips this member, so
  // "never synced" is correct rather than broken — say the actionable thing.
  if (!userDoc?.leetcodeUsername && !userDoc?.hackerrankUsername) {
    return (
      <p className={`font-mono text-xs text-galaxy-dim ${className}`}>
        Link a coding account on your profile to start earning XP.
      </p>
    );
  }

  const ms = userDoc?.lastSyncedAt?.toMillis?.();

  return (
    <p
      className={`flex items-center gap-1.5 font-mono text-xs text-galaxy-dim ${className}`}
    >
      <PiArrowsClockwiseBold className="h-3 w-3 shrink-0" aria-hidden="true" />
      {ms ? (
        <>
          Last checked {relativeMinutes(ms)} · updates roughly every 15 minutes
        </>
      ) : (
        <>Waiting for the first check — this can take up to 15 minutes.</>
      )}
    </p>
  );
}
