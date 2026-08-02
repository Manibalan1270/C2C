import { useId, useState } from "react";
import type { CodingPlatform } from "../../types/schema";
import { normalizePlatformUsername } from "../../lib/validation";

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
}: {
  icon: React.ReactNode;
  name: string;
  platform: CodingPlatform;
  username: string | null;
  blurb: string;
  onSave: (value: string | null) => Promise<void>;
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
