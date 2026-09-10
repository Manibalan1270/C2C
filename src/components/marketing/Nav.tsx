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

/**
 * Which section the reader is currently in.
 *
 * The rootMargin collapses the viewport to a thin band across its middle, so
 * "active" means "this section is under the middle of your screen" rather than
 * "any part of this section is visible". Without that, two adjacent sections
 * are both on screen for most of a scroll and the indicator flickers between
 * them — the band makes the handover happen once, at a predictable point.
 */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order, not intersection order: when the band spans two
        // sections the earlier one wins, so the indicator only ever moves
        // forward as you scroll down.
        setActive(SECTION_IDS.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function Nav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const active = useActiveSection();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      const revealAfterPx = window.innerHeight * HERO_VH_MULTIPLIER;
      setVisible(window.scrollY >= revealAfterPx);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  /**
   * The travelling brackets.
   *
   * These are the same corner brackets SectionHeading draws around every
   * section title — the site's existing motif, borrowed rather than a new one
   * invented for the nav. Because both halves carry a `layoutId`, framer-motion
   * animates them from the old link to the new one instead of cutting, so the
   * brackets physically walk along the bar as you scroll and appear to "pick
   * up" whichever section you have reached.
   *
   * It earns its place by saying something true — where you are in the page —
   * rather than decorating. Brackets are also simply what the club works in:
   * they are how you index into a thing in code.
   */
  const bracket = (position: "tl" | "br") => (
    <motion.span
      aria-hidden="true"
      layoutId={`nav-bracket-${position}`}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 500, damping: 34 }
      }
      className={
        position === "tl"
          ? "pointer-events-none absolute -left-1.5 -top-1 h-2 w-2 border-l-2 border-t-2 border-accent"
          : "pointer-events-none absolute -bottom-1 -right-1.5 h-2 w-2 border-b-2 border-r-2 border-accent"
      }
    />
  );

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
      <div className="flex max-w-full items-center gap-3 rounded-full border border-hairline bg-surface/90 px-4 py-2 shadow-sm backdrop-blur sm:gap-8">
        <motion.img
          src={clubLogo}
          alt="C2C logo"
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="h-8 w-8 shrink-0 rounded-full border border-hairline-strong object-contain p-0.5 invert"
        />

        {/* Scrolls rather than hiding below sm. The links were `hidden sm:flex`,
            which left phone users with no way to reach any section — on the one
            device where scrolling past four screens of content to find the blog
            is most tedious. */}
        <ul className="scrollbar-none m-0 flex min-w-0 list-none items-center gap-5 overflow-x-auto p-0 sm:gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id} className="relative shrink-0">
                <a
                  href={`#${link.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={[
                    "inline-block whitespace-nowrap rounded-sm font-body text-sm transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
                    isActive ? "text-graphite" : "text-slate hover:text-graphite",
                  ].join(" ")}
                >
                  {link.label}
                </a>
                {isActive && (
                  <>
                    {bracket("tl")}
                    {bracket("br")}
                  </>
                )}
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
