// Shared between Hero (which owns the scroll-linked landing animation and
// its own height) and Nav (which needs to know when the landing page has
// finished before it's allowed to appear).
// Kept small deliberately — a taller value leaves a long dead stretch of
// empty black scroll after the reveal finishes and before the next
// section appears, which read as "lag" during testing.
export const HERO_VH_MULTIPLIER = 1.4;
