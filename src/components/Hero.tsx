import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import clubLogo from "../assets/club-logo.jpeg";
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

  const logoY = useTransform(scrollYProgress, [0, 0.45], [0, -200]);
  const logoScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.4]);
  const textOpacity = useTransform(scrollYProgress, [0.25, 0.6], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.25, 0.6], [30, 0]);

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
          className="h-48 w-48 rounded-2xl object-cover sm:h-64 sm:w-64"
        />

        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute inset-x-0 top-[60%] flex flex-col items-center px-6 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-void-muted">
            Compete to Compute
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
            C2C Programming Club
          </h1>
          <p className="mt-6 max-w-xl text-base text-void-muted sm:text-lg">
            Where curiosity meets code. Solve, compete, and level up with a community
            built for people who love to build.
          </p>

          <a
            href="#about"
            className="mt-10 rounded-full border border-void-muted px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
          >
            Explore More
          </a>
        </motion.div>
      </div>
    </div>
  );
}
