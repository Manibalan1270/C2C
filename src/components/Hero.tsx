import { useRef } from "react";
import { motion, useScroll, useTransform, easeInOut } from "framer-motion";
import clubLogo from "../assets/club-logo-transparent.png";
import { HERO_VH_MULTIPLIER } from "../lib/layout";

/**
 * Logo starts centered, big, on its own; scrolling drives it up + shrinks
 * it, then the club details fade/slide in to take its place. Everything
 * here animates only `y` / `scale` / `opacity` (CSS transform/opacity,
 * GPU-composited) — never `top` / `left` (layout properties that force
 * reflow every frame, which is what caused stutter in an earlier version).
 */
export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Hero is tall (HERO_VH_MULTIPLIER) so the black background has room to
  // breathe, but the logo->text transition itself should feel immediate.
  // Logo and text share the exact same scroll range so they move as one
  // continuous piece of choreography (logo rising/shrinking while text
  // simultaneously fades/slides in) instead of two disconnected phases.
  const REVEAL_RANGE: [number, number] = [0, 0.2];
  const logoY = useTransform(scrollYProgress, REVEAL_RANGE, [0, -200], { ease: [easeInOut] });
  const logoScale = useTransform(scrollYProgress, REVEAL_RANGE, [1, 0.4], { ease: [easeInOut] });
  const textOpacity = useTransform(scrollYProgress, REVEAL_RANGE, [0, 1], { ease: [easeInOut] });
  const textY = useTransform(scrollYProgress, REVEAL_RANGE, [40, 0], { ease: [easeInOut] });

  return (
    <div
      ref={containerRef}
      className="relative bg-void text-void-text"
      style={{ height: `${HERO_VH_MULTIPLIER * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
        <motion.img
          src={clubLogo}
          alt="C2C Programming Club"
          style={{ y: logoY, scale: logoScale }}
          className="h-56 w-56 object-contain sm:h-80 sm:w-80"
        />

        {/* Anchored at 44% (not 60%) with tightened spacing below, so the
            full text + button block always fits inside the remaining
            viewport height instead of the button clipping into the next
            section on shorter screens. */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute inset-x-0 top-[44%] flex flex-col items-center px-6 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-void-muted">
            Compete to Compute
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            C2C Programming Club
          </h1>
          <p className="mt-4 max-w-xl text-sm text-void-muted sm:text-lg">
            Where curiosity meets code. Solve, compete, and level up with a community
            built for people who love to build.
          </p>

          <a
            href="#about"
            className="mt-6 rounded-full border border-void-muted px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
          >
            Explore More
          </a>
        </motion.div>
      </div>
    </div>
  );
}
