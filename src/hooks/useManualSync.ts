import { useCallback, useState } from "react";
import { auth } from "../lib/firebase";

/**
 * Drives the "Refresh my stats" button.
 *
 * Calls the on-demand sync endpoint with the member's Firebase ID token. The
 * endpoint derives the uid from that token, so there is nothing to send in the
 * body — a uid in the request would be an attacker-controlled value, and the
 * server deliberately ignores anything of the sort.
 *
 * Configured by VITE_SYNC_API_URL. When that isn't set the hook reports itself
 * as unavailable rather than failing at click time, so the button can be
 * hidden entirely instead of appearing and then erroring — a control that is
 * visible but never works is worse than no control.
 */

const API_URL = import.meta.env.VITE_SYNC_API_URL as string | undefined;

export type SyncState = "idle" | "syncing" | "done" | "error";

export function useManualSync(onDone?: () => void) {
  const [state, setState] = useState<SyncState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !API_URL) return;

    setState("syncing");
    setMessage(null);
    try {
      // Force-refresh the token: a stale one fails `verifyIdToken` server-side
      // and the member would see "session expired" for no reason.
      const token = await user.getIdToken(true);
      const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        summary?: string;
      };

      if (!res.ok) {
        setState("error");
        setMessage(body.error ?? "Couldn't refresh. Try again shortly.");
        return;
      }

      setState("done");
      // "no change" is the engine's own wording for an idle run. Passing that
      // through as-is reads like a failure, so translate it to something that
      // answers the question the member actually asked.
      setMessage(
        body.summary && !body.summary.startsWith("no change")
          ? "Updated."
          : "You're up to date — nothing new since the last check.",
      );
      onDone?.();
    } catch {
      setState("error");
      setMessage("Couldn't reach the sync service. Check your connection.");
    }
  }, [onDone]);

  return { run, state, message, available: Boolean(API_URL) };
}
