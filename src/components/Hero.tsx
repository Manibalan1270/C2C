import { useRef } from "react";
import { motion, useScroll, useTransform, easeInOut, cubicBezier } from "framer-motion";
import clubLogo from "../assets/club-logo-transparent.png";
import { HERO_VH_MULTIPLIER } from "../lib/layout";
import { FloatingPaths } from "./ui/background-paths";

// A "back out" curve — slight overshoot then settle — for the text's pop-in.
const POP_EASE = cubicBezier(0.34, 1.56, 0.64, 1);

/**
 * Logo starts centered, big, on its own; scrolling drives it up, shrinks,
 * and fades it out entirely (it doesn't linger as a small badge sitting in
 * empty space) while the club details pop in to take its place. Everything
 * here animates only `y` / `scale` / `opacity` (CSS transform/opacity,
 * GPU-composited) — never `top` / `left`.
 */
export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const REVEAL_RANGE: [number, number] = [0, 0.35];
  const logoY = useTransform(scrollYProgress, REVEAL_RANGE, [0, -220], { ease: [easeInOut] });
  const logoScale = useTransform(scrollYProgress, REVEAL_RANGE, [1, 0.35], { ease: [easeInOut] });
  const logoOpacity = useTransform(scrollYProgress, [0.15, 0.35], [1, 0], { ease: [easeInOut] });

  const textOpacity = useTransform(scrollYProgress, REVEAL_RANGE, [0, 1], { ease: [POP_EASE] });
  const textScale = useTransform(scrollYProgress, REVEAL_RANGE, [0.92, 1], { ease: [POP_EASE] });
  const textY = useTransform(scrollYProgress, REVEAL_RANGE, [16, 0], { ease: [POP_EASE] });

  // Background lines drift horizontally with scroll position — right as you
  // scroll down, back left as you scroll up (it reverses naturally because
  // it's tied to position, not velocity). Two layers at different rates for
  // a little depth. This is one `x` transform per layer, not per path: the
  // earlier per-path pathLength/pathOffset animation is what caused the
  // page-wide flicker, so the SVG itself stays completely static.
  const pathsXFront = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const pathsXBack = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <div
      ref={containerRef}
      className="relative bg-void text-void-text"
      style={{ height: `${HERO_VH_MULTIPLIER * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
        {/* Oversized wrappers (wider than the viewport) so the horizontal
            drift never exposes an empty edge. */}
        <div className="absolute inset-0 overflow-hidden text-void-text">
          <motion.div
            style={{ x: pathsXBack }}
            className="absolute inset-y-0 left-[-25%] right-[-25%]"
          >
            <FloatingPaths position={-1} />
          </motion.div>
          <motion.div
            style={{ x: pathsXFront }}
            className="absolute inset-y-0 left-[-25%] right-[-25%]"
          >
            <FloatingPaths position={1} />
          </motion.div>
        </div>

        <motion.img
          src={clubLogo}
          alt="C2C Programming Club"
          style={{ y: logoY, scale: logoScale, opacity: logoOpacity }}
          className="h-56 w-56 object-contain sm:h-80 sm:w-80"
        />

        <motion.div
          style={{ opacity: textOpacity, scale: textScale, y: textY }}
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
            className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            Explore More
          </a>
        </motion.div>
      </div>
    </div>
  );
}
