/**
 * Shared HTTP helpers for the platform scrapers.
 *
 * Both platforms are being read through undocumented endpoints, so
 * everything here is defensive: a real User-Agent, an explicit timeout, and
 * a deliberate delay between calls. We are a guest on someone else's
 * infrastructure — a scheduled job that hammers them is how a club gets its
 * IP range blocked.
 */

const USER_AGENT =
  "C2C-Club-Sync/1.0 (+https://github.com/Manibalan1270/C2C; college coding club leaderboard)";

const TIMEOUT_MS = 15_000;

export async function politeDelay(ms = 1200): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `HTTP ${res.status} from ${new URL(url).host}`,
      };
    }

    return { ok: true, data: (await res.json()) as T };
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      message: aborted
        ? `Timed out after ${TIMEOUT_MS / 1000}s`
        : `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
