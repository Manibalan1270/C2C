import { useCallback, useState } from "react";
import { auth } from "../lib/firebase";
import type { CodingPlatform } from "../types/schema";

/**
 * Live check of a platform handle, for the Profile's verification badges.
 *
 * Goes through the server for a hard reason rather than a preference:
 * LeetCode's GraphQL endpoint sends no CORS headers, so a browser cannot call
 * it at all. Anything the member sees has to be proxied.
 *
 * When VITE_SYNC_API_URL is unset the hook reports itself unavailable and the
 * UI falls back to the status the sync engine last stored. That fallback is
 * the normal case until the endpoint is deployed, so it has to look
 * deliberate rather than broken.
 */

const API_URL = import.meta.env.VITE_SYNC_API_URL as string | undefined;

export interface VerifyResult {
  verified: boolean;
  detailsPublic: boolean;
  detail: string;
  error: string | null;
}

export function usePlatformVerify() {
  const [checking, setChecking] = useState<CodingPlatform | null>(null);
  const [result, setResult] = useState<Partial<Record<CodingPlatform, VerifyResult>>>({});

  const verify = useCallback(
    async (platform: CodingPlatform, username: string): Promise<VerifyResult | null> => {
      const user = auth.currentUser;
      if (!user || !API_URL || !username.trim()) return null;

      setChecking(platform);
      try {
        const token = await user.getIdToken(true);
        const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform, username }),
        });
        const body = (await res.json().catch(() => ({}))) as
          | VerifyResult
          | { error?: string };

        if (!res.ok) {
          const out: VerifyResult = {
            verified: false,
            detailsPublic: false,
            detail: "",
            error: (body as { error?: string }).error ?? "Couldn't check that handle.",
          };
          setResult((r) => ({ ...r, [platform]: out }));
          return out;
        }

        const out = body as VerifyResult;
        setResult((r) => ({ ...r, [platform]: out }));
        return out;
      } catch {
        const out: VerifyResult = {
          verified: false,
          detailsPublic: false,
          detail: "",
          error: "Couldn't reach the verification service.",
        };
        setResult((r) => ({ ...r, [platform]: out }));
        return out;
      } finally {
        setChecking(null);
      }
    },
    [],
  );

  return { verify, checking, result, available: Boolean(API_URL) };
}
