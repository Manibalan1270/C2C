import { useEffect, useRef } from "react";
import { useTheme } from "../../lib/ThemeContext";

/**
 * A soft accent-coloured light that trails the pointer across the members
 * area, plus a small precise dot that tracks it exactly.
 *
 * Kept, but turned down: the LeetCode direction is a flat utilitarian surface,
 * so the halo is now a faint warm wash rather than the feature it used to be.
 * How loud it gets is `--fx-cursor-opacity` in index.css — one value, and it
 * is 0 in light mode, where a glow over a white page only muddies it. The
 * effect skips its rAF loop entirely when that value is 0, so an invisible
 * halo costs nothing per frame.
 *
 * Written against transform/opacity only and driven by a single rAF loop
 * rather than a state update per mousemove — a React re-render on every
 * pointer event would blow the frame budget on its own. The halo eases
 * toward the pointer while the dot snaps to it, which is what reads as
 * "weight" rather than two elements moving in lockstep.
 *
 * Disabled entirely for touch/coarse pointers (nothing to follow) and for
 * `prefers-reduced-motion`.
 */
export default function CursorGlow() {
  const haloRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    // Read the dimmer rather than branching on the theme name, so the single
    // place that decides "how loud" stays index.css. Re-runs on theme change
    // because the value is per-theme.
    const strength = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--fx-cursor-opacity",
      ),
    );
    if (!(strength > 0)) return;

    const halo = haloRef.current;
    const dot = dotRef.current;
    if (!halo || !dot) return;

    // Start off-screen so neither element flashes at 0,0 before first move.
    let targetX = -200;
    let targetY = -200;
    let haloX = targetX;
    let haloY = targetY;
    let frame = 0;
    let visible = false;

    function onMove(e: PointerEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible && halo && dot) {
        visible = true;
        halo.style.opacity = String(strength);
        dot.style.opacity = String(strength);
      }
    }

    function onLeave() {
      visible = false;
      if (halo) halo.style.opacity = "0";
      if (dot) dot.style.opacity = "0";
    }

    function loop() {
      // Exponential ease toward the pointer — the lag is the effect.
      haloX += (targetX - haloX) * 0.13;
      haloY += (targetY - haloY) * 0.13;
      if (halo) halo.style.transform = `translate3d(${haloX}px, ${haloY}px, 0)`;
      if (dot) dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      frame = requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [theme]);

  return (
    <>
      <div
        ref={haloRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-[420px] w-[420px] opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          marginLeft: -210,
          marginTop: -210,
          background:
            "radial-gradient(circle, rgba(255,161,22,0.10) 0%, rgba(255,161,22,0.05) 38%, transparent 68%)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-galaxy-accent opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          marginLeft: -3,
          marginTop: -3,
          boxShadow: "0 0 10px 2px rgba(255,161,22,0.6)",
        }}
      />
    </>
  );
}
