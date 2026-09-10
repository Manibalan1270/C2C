import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import clubLogo from "../../assets/club-logo-transparent.png";
import { HERO_VH_MULTIPLIER } from "../../lib/layout";
import { useAuth } from "../../lib/AuthContext";

const NAV_LINKS = [
  { label: "About Us", id: "about" },
  { label: "Events", id: "events" },
  { label: "Blogs", id: "blog" },
  { label: "Board Members", id: "board" },
];

const SECTION_IDS = NAV_LINKS.map((l) => l.id);

/** Circumference of the progress ring: r=16 inside a 36-unit viewBox. */
const RING = 2 * Math.PI * 16;

/**
 * Which section the reader is in, and how far through the page they are.
 *
 * One effect for both, because both answer on scroll and splitting them would
 * mean two passes over the same event.
 *
 * The observer's rootMargin collapses the viewport to a band across its
 * middle, so "active" means "under the middle of your screen" rather than
 * "visible at all". Without that, two adjacent sections are both on screen for
 * most of a scroll and the marker flickers between them; the band makes the
 * handover happen once, at a predictable point.
 */
function usePagePosition() {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add(entry.target.id);
          else seen.delete(entry.target.id);
        }
        // Document order, not intersection order: when the band spans two
        // sections the earlier one wins, so the marker only moves forward.
        setActive(SECTION_IDS.find((id) => seen.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { active, progress };
}

export default function Nav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const { active, progress } = usePagePosition();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY >= window.innerHeight * HERO_VH_MULTIPLIER);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const bracketSpring = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 520, damping: 36 } as const);

  return (
    <nav
      aria-label="Site sections"
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-3 transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? "0" : "-16px"})`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex max-w-full items-center gap-2 rounded-full border border-hairline bg-surface/90 p-2 shadow-sm backdrop-blur sm:gap-4 sm:pl-3">
        {/*
          The logo wears a scroll-progress ring.

          It was the one inert thing in the bar — a mark that did nothing — and
          "how far through the page am I" is precisely the question the brackets
          below do NOT answer. They say WHICH section; this says HOW FAR. Two
          different facts, so two indicators rather than one doing double duty.
        */}
        <button
          type="button"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
          }
          aria-label={`Back to top. ${Math.round(progress * 100)} percent through the page.`}
          className="relative block h-9 w-9 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg
            viewBox="0 0 36 36"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="2"
              className="stroke-hairline-strong"
              opacity="0.35"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-accent"
              style={{
                strokeDasharray: RING,
                strokeDashoffset: RING * (1 - progress),
                // Deliberately no CSS transition. The value is already driven
                // by scroll position; easing it would make the ring lag the
                // page it is describing.
              }}
            />
          </svg>
          <img
            src={clubLogo}
            alt="C2C logo"
            className="absolute inset-[6px] rounded-full object-contain invert"
          />
        </button>

        {/*
          Scrolls rather than hiding below sm — these were `hidden sm:flex`,
          which left phone users no way to reach any section on the device
          where scrolling four screens to find the blog is most tedious.

          Note this is a CLIPPING context. The brackets below must therefore
          sit inside each link's own box; an earlier version used negative
          offsets and was silently clipped to nothing.
        */}
        <ul className="scrollbar-none m-0 flex min-w-0 list-none items-center gap-0.5 overflow-x-auto p-0 sm:gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id} className="shrink-0">
                <a
                  href={`#${link.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={[
                    "relative inline-block whitespace-nowrap px-3 py-2 font-body text-sm transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    isActive ? "text-graphite" : "text-slate hover:text-graphite",
                  ].join(" ")}
                >
                  {link.label}

                  {/*
                    The travelling brackets.

                    These are the corner brackets SectionHeading already draws
                    around every section title — the site's own motif, borrowed
                    rather than a second visual idea invented for the nav. Both
                    halves share a layoutId, so framer-motion animates them from
                    the previous link to this one instead of cutting: they walk
                    along the bar and appear to pick up whichever section you
                    have reached.
                  */}
                  {isActive && (
                    <>
                      <motion.span
                        aria-hidden="true"
                        layoutId="nav-bracket-tl"
                        transition={bracketSpring}
                        className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-accent"
                      />
                      <motion.span
                        aria-hidden="true"
                        layoutId="nav-bracket-br"
                        transition={bracketSpring}
                        className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-accent"
                      />
                    </>
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Always the same door into the members area — signed-in members
            skip the login screen and go straight to the splash. */}
        <motion.button
          onClick={() => navigate(user ? "/welcome" : "/login")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Compete
        </motion.button>
      </div>
    </nav>
  );
}
