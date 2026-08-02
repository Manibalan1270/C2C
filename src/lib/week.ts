/**
 * Date/week helpers, pinned to the club's timezone. Pure — no Firebase, no
 * React — shared by the browser and the future Node sync engine.
 *
 * Why this file has to exist and be shared: the sync engine runs on a
 * GitHub Actions runner (UTC), members are in India (UTC+5:30). If the
 * client buckets "today" by local browser time and the engine buckets by
 * UTC, roughly a quarter of every day's solves land in the wrong bucket —
 * every date/week computation on both sides must go through here.
 */

export const CLUB_TZ = "Asia/Kolkata";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" for the given instant, in the club timezone. */
export function dayKey(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD directly.
  return dayKeyFormatter.format(d);
}

/** The most recent `n` day keys, oldest first, ending with today. */
export function lastNDayKeys(n: number, end: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(dayKey(d));
  }
  return keys;
}

/**
 * ISO 8601 week key, e.g. "2026-W31" — Monday-start weeks, week 1 is the
 * week containing the year's first Thursday. Computed against the club
 * timezone's calendar date, not the instant's UTC date.
 */
export function isoWeekKey(d: Date = new Date()): string {
  // Parse the club-tz calendar date back into a UTC-anchored Date so the
  // ISO week math below (which works in UTC to dodge DST edge cases) starts
  // from the day the club considers "today", not whatever day it is in UTC.
  const [y, m, day] = dayKey(d).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));

  // ISO weekday: Monday = 1 ... Sunday = 7.
  const isoWeekday = date.getUTCDay() || 7;
  // Shift to the Thursday of this ISO week — the year that Thursday falls
  // in is the ISO week-numbering year, which can differ from the calendar
  // year in the last/first days of December/January.
  date.setUTCDate(date.getUTCDate() + 4 - isoWeekday);

  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const dayOfYear = (date.getTime() - yearStart) / (24 * 60 * 60 * 1000);
  // +1 must happen before the /7, not after — that ordering is the whole
  // formula, and getting it backwards silently off-by-ones week 52/53 at
  // the year boundary (caught by cross-checking against a second, known-
  // correct implementation rather than trusting hand-picked expectations).
  const weekNum = Math.ceil((dayOfYear + 1) / 7);

  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}
