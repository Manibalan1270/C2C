import { useId, useState } from "react";
import {
  PiArrowSquareOutBold,
  PiCheckCircleFill,
  PiEyeSlashFill,
  PiWarningCircleFill,
} from "react-icons/pi";
import type { CodingPlatform, PlatformStatus } from "../../types/schema";
import { normalizePlatformUsername } from "../../lib/validation";

/**
 * Where a member turns their submission history public.
 *
 * LeetCode has no deep link to the specific toggle, so this points at the
 * profile settings page it lives on. HackerRank has no equivalent setting —
 * its badge list is either readable or the whole profile is private — so it
 * gets no link, because sending someone hunting for a switch that does not
 * exist is worse than saying nothing.
 */
const HISTORY_SETTINGS_URL: Partial<Record<CodingPlatform, string>> = {
  leetcode: "https://leetcode.com/profile/",
};

/**
 * The two status pills.
 *
 * Rendered as separate indicators on purpose. "Your account is real" and
 * "your history is readable" have different fixes and different consequences,
 * and collapsing them into one badge would tell a member with a perfectly good
 * account that something is broken when only an optional toggle is off.
 *
 * Every pill carries an icon and words. Colour alone never states the result —
 * red and green are the single worst pair to rely on for that.
 */
function StatusPills({
  platform,
  status,
  checking,
}: {
  platform: CodingPlatform;
  status: PlatformStatus | null;
  checking: boolean;
}) {
  if (checking) {
    return (
      <p className="mt-2 font-mono text-xs text-galaxy-dim">Checking with {platform}…</p>
    );
  }
  if (!status) {
    return (
      <p className="mt-2 font-mono text-xs text-galaxy-dim">
        Not checked yet — the next sync will confirm it.
      </p>
    );
  }

  const settingsUrl = HISTORY_SETTINGS_URL[platform];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {status.verified ? (
        <span
          className="flex items-center gap-1.5 font-mono text-xs"
          style={{ color: "var(--chart-good)" }}
        >
          <PiCheckCircleFill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Account verified
          {status.detail && (
            <span className="text-galaxy-dim">· {status.detail}</span>
          )}
        </span>
      ) : (
        <span
          className="flex items-center gap-1.5 font-mono text-xs"
          style={{ color: "var(--chart-bad)" }}
        >
          <PiWarningCircleFill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {status.error ?? "Couldn't verify this account"}
        </span>
      )}

      {/* Only meaningful once the account itself checks out, and only for a
          platform that actually has the setting. */}
      {status.verified && settingsUrl && (
        status.detailsPublic ? (
          <span
            className="flex items-center gap-1.5 font-mono text-xs"
            style={{ color: "var(--chart-good)" }}
          >
            <PiCheckCircleFill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            History public · challenges tracked
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-galaxy-accent-text">
            <PiEyeSlashFill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            History private · challenges won't tick off
            <a
              href={settingsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              Turn it on
              <PiArrowSquareOutBold className="h-3 w-3" aria-hidden="true" />
            </a>
          </span>
        )
      )}
    </div>
  );
}

/**
 * One platform's link row: idle (shows current state), editing (a text
 * field + Save/Cancel/Unlink), or saving. `onSave` receives the already-
 * normalised value (or null to unlink) and is expected to persist it —
 * this component owns no Firestore code itself.
 */
export default function LinkAccountRow({
  icon,
  name,
  platform,
  username,
  blurb,
  onSave,
  status = null,
  checking = false,
  onVerify,
}: {
  icon: React.ReactNode;
  name: string;
  platform: CodingPlatform;
  username: string | null;
  blurb: string;
  onSave: (value: string | null) => Promise<void>;
  /** Last known status, from the sync engine or a live check. */
  status?: PlatformStatus | null;
  checking?: boolean;
  /** Re-check this handle against the platform right now. */
  onVerify?: (username: string) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"idle" | "editing" | "saving">("idle");
  const [draft, setDraft] = useState(username ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const linked = username !== null;

  function startEditing() {
    setDraft(username ?? "");
    setError(null);
    setMode("editing");
  }

  function cancel() {
    setError(null);
    setMode("idle");
  }

  async function save() {
    setError(null);

    if (draft.trim() === "") {
      // Blank + Save on an unlinked row is a no-op cancel, not an error.
      if (!linked) {
        setMode("idle");
        return;
      }
      setMode("saving");
      try {
        await onSave(null);
        setMode("idle");
      } catch {
        setError("Couldn't unlink — try again in a moment.");
        setMode("editing");
      }
      return;
    }

    const result = normalizePlatformUsername(platform, draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (result.value === username) {
      setMode("idle");
      return;
    }

    setMode("saving");
    try {
      await onSave(result.value);
      setMode("idle");
      // Verify immediately after saving. This is the exact moment the member
      // wants the answer — they have just typed a username and want to know
      // whether they got it right, not at some point in the next 15 minutes.
      void onVerify?.(result.value);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "permission-denied"
          ? "Couldn't save — try signing out and back in."
          : "Something went wrong saving that. Try again.",
      );
      setMode("editing");
    }
  }

  async function unlink() {
    setError(null);
    setMode("saving");
    try {
      await onSave(null);
      setMode("idle");
    } catch {
      setError("Couldn't unlink — try again in a moment.");
      setMode("idle");
    }
  }

  return (
    <div className="rounded-xl border border-galaxy-line bg-galaxy-deep p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="shrink-0 text-2xl text-galaxy-accent-text">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{name}</p>
            {mode === "idle" && (
              <p className="truncate text-xs text-galaxy-muted">
                {linked ? `@${username}` : blurb}
              </p>
            )}
          </div>
        </div>

        {mode === "idle" && linked && onVerify && (
          <button
            type="button"
            onClick={() => onVerify(username)}
            disabled={checking}
            className="shrink-0 rounded-full border border-galaxy-line px-3 py-1.5 text-xs font-medium text-galaxy-muted transition hover:border-galaxy-dim hover:text-galaxy-text disabled:opacity-60"
          >
            {checking ? "Checking…" : "Re-check"}
          </button>
        )}

        {mode === "idle" && (
          <button
            type="button"
            onClick={startEditing}
            className={
              linked
                ? "shrink-0 rounded-full border border-galaxy-line px-3.5 py-1.5 text-xs font-medium text-galaxy-muted transition hover:border-galaxy-dim hover:text-galaxy-text"
                : // The accent is a light lavender, so filled buttons take
                  // dark text: near-black clears 9.45:1 on it where white
                  // manages only 2.21:1.
                  "shrink-0 rounded-full bg-galaxy-cta px-3.5 py-1.5 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90"
            }
          >
            {linked ? "Manage" : "Link account"}
          </button>
        )}
      </div>

      {/* Status sits under the row, not inline with the name — it wraps onto
          two lines on a phone and would otherwise squeeze the buttons. */}
      {mode === "idle" && linked && (
        <StatusPills platform={platform} status={status} checking={checking} />
      )}

      {mode !== "idle" && (
        <div className="mt-3">
          <label htmlFor={inputId} className="sr-only">
            {name} username
          </label>
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={mode === "saving"}
            placeholder={`Your ${name} username, or paste your profile link`}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60"
          />
          {error && (
            <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={mode === "saving"}
              className="rounded-full bg-galaxy-cta px-3.5 py-1.5 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
            >
              {mode === "saving" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={mode === "saving"}
              className="rounded-full border border-galaxy-line px-3.5 py-1.5 text-xs text-galaxy-muted transition hover:text-galaxy-text disabled:opacity-60"
            >
              Cancel
            </button>
            {linked && (
              <button
                type="button"
                onClick={unlink}
                disabled={mode === "saving"}
                className="ml-auto text-xs text-galaxy-muted transition hover:text-red-400 disabled:opacity-60"
              >
                Unlink
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
