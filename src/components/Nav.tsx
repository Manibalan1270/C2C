import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clubLogo from "../assets/club-logo-transparent.png";
import { HERO_VH_MULTIPLIER } from "../lib/layout";
import { useAuth } from "../lib/AuthContext";

const NAV_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Events", href: "#events" },
  { label: "Blogs", href: "#blog" },
  { label: "Board Members", href: "#board" },
];

export default function Nav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

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

  return (
    <nav
      className="fixed inset-x-0 top-4 z-50 flex justify-center transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? "0" : "-16px"})`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-8 rounded-full border border-hairline bg-surface/90 px-4 py-2 shadow-sm backdrop-blur">
        <motion.img
          src={clubLogo}
          alt="C2C logo"
          whileHover={{ scale: 1.2, rotate: -8 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="h-8 w-8 rounded-full border border-hairline-strong object-contain p-0.5 invert"
        />

        <ul className="hidden items-center justify-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <motion.a
                href={link.href}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="inline-block font-body text-sm text-slate transition-colors hover:text-graphite"
              >
                {link.label}
              </motion.a>
            </li>
          ))}
        </ul>

        {/* Always the same door into the members area — signed-in members
            skip the login screen and go straight to the splash. */}
        <motion.button
          onClick={() => navigate(user ? "/welcome" : "/login")}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Compete
        </motion.button>
      </div>
    </nav>
  );
}
