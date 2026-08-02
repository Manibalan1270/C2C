/**
 * Chart colour tokens for the members area.
 *
 * Every export here is a `var()` reference rather than a literal, and that is
 * the whole trick behind the light/dark toggle: SVG `fill`/`stroke` and inline
 * `backgroundColor` all resolve custom properties at paint time, so flipping
 * `data-theme` on <html> rethemes every chart with no re-render, no context read,
 * and no change to any of the seven files that import from here.
 *
 * The actual values — and the reasoning behind each step, including why the
 * difficulty ramp keeps LeetCode's literal colours in dark but needs its own
 * selected steps in light — live in src/index.css next to the rest of the
 * theme. Look there before changing anything, and re-run the dataviz
 * validator against BOTH surfaces (#282828 dark, #ffffff light) after you do.
 */

/** Single-series / primary mark colour. */
export const MARK = "var(--chart-mark)";

/** Context marks in an emphasis chart — present, but recessive. */
export const MARK_MUTED = "var(--chart-mark-muted)";

/** Unfilled meter track. */
export const TRACK = "var(--chart-track)";

/** Ordered ramp for difficulty (easy -> hard). */
export const ORDINAL = [
  "var(--chart-ordinal-1)",
  "var(--chart-ordinal-2)",
  "var(--chart-ordinal-3)",
] as const;

/**
 * XP shares the primary mark rather than taking a hue of its own. Nothing
 * plots XP against another measure in the same chart, so a second hue would
 * add a colour without adding a distinction.
 */
export const XP_MARK = "var(--chart-xp)";

/**
 * Direction semantics. This theme does have a real green/red pair, so
 * improvement and slippage no longer lean on the caret alone — but the caret
 * icon and the word beside it stay, because colour is never the only cue.
 */
export const GOOD = "var(--chart-good)";
export const BAD = "var(--chart-bad)";
export const NEUTRAL = "var(--chart-neutral)";

/** Surface colour, for the 2px gaps and rings that separate marks. */
export const SURFACE = "var(--chart-surface)";

export const GRID = "var(--chart-grid)";
