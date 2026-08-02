import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import GalaxyBackground from "./GalaxyBackground";

/** Beat timings, ms from mount. */
const HOLD_MS = 3200; // headline sits still and readable
const EXIT_MS = 1200; // curtain lift
const SPIN_UP_MS = 1000; // how long the particles take to reach full speed

/** Rotation multiplier the galaxy reaches during the exit. */
const BOOST_PEAK = 26;

/**
 * The welcome curtain: a full-bleed galaxy that holds a headline, then lifts
 * straight up off the top of the screen.
 *
 * Deliberately an overlay rather than a route. The dashboard is already
 * mounted and running underneath, so it isn't "loaded next" — it's revealed,
 * and it's fully interactive the instant the curtain clears. It also stays
 * opaque all the way up rather than cross-fading: a curtain that dissolves
 * reads as a loading screen, one that travels reads as a reveal.
 */
export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const boostRef = useRef(1);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Anyone who asked for less motion gets the dashboard, not the show.
    if (reduceMotion) {
      onDone();
      return;
    }

    let raf = 0;
    let spinStart = 0;

    // Ease the rotation up rather than snapping to it, so the disc appears to
    // wind up under load.
    function rampSpin(now: number) {
      if (!spinStart) spinStart = now;
      const t = Math.min((now - spinStart) / SPIN_UP_MS, 1);
      boostRef.current = 1 + t * t * (BOOST_PEAK - 1);
      if (t < 1) raf = requestAnimationFrame(rampSpin);
    }

    const exitTimer = setTimeout(() => {
      setLeaving(true);
      raf = requestAnimationFrame(rampSpin);
    }, HOLD_MS);

    const doneTimer = setTimeout(onDone, HOLD_MS + EXIT_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      cancelAnimationFrame(raf);
      boostRef.current = 1;
    };
  }, [onDone, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <motion.div
      // Above the nav (z-30) and the cursor glow (z-60).
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden px-6 text-center"
      // Pinned dark in both themes. This is a launch screen shown for 3.2s
      // before the app appears, not a surface inside it — flipping it white in
      // light mode would make the reveal read as a page that failed to load.
      style={{ backgroundColor: "#141414", color: "#eff1f6" }}
      initial={{ y: 0 }}
      animate={{ y: leaving ? "-101vh" : 0 }}
      transition={{
        duration: EXIT_MS / 1000,
        // easeInOutQuart — settles into the lift, then clears fast.
        ease: [0.76, 0, 0.24, 1],
      }}
      aria-hidden={leaving}
    >
      <GalaxyBackground variant="splash" boostRef={boostRef} />

      {/* Text sits on its own darkened pocket rather than straight on the
          disc — additive blending means the core can always out-brighten
          type, so the headline needs a floor it can rely on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 46% 30% at 50% 50%, rgba(1,1,1,0.72), transparent 75%)",
        }}
      />

      <div className="relative z-10 max-w-2xl">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          // Pinned alongside the curtain itself — a theme token here would go
          // dark-on-dark the moment light mode is active.
          style={{ color: "#ffa116" }}
          className="font-tech text-xs uppercase"
        >
          Compete to Compute
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 26, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          // Colour inherited from the pinned curtain, for the same reason.
          className="mt-5 font-tech text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
        >
          Getting into the
          <br />
          Computing World
        </motion.h1>

        {/* A hairline that draws itself open under the headline — the
            "loading" beat, without a spinner. */}
        <motion.span
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: (HOLD_MS - 500) / 1000,
            ease: "linear",
            delay: 0.5,
          }}
          style={{ backgroundColor: "rgba(255,161,22,0.7)" }}
          className="mx-auto mt-9 block h-px w-44 origin-left"
        />
      </div>
    </motion.div>
  );
}
