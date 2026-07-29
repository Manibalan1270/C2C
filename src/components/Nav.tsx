import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clubLogo from "../assets/club-logo-transparent.png";
import { HERO_VH_MULTIPLIER } from "../lib/layout";

const NAV_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Events", href: "#events" },
  { label: "Blogs", href: "#blog" },
  { label: "Board Members", href: "#board" },
];

export default function Nav() {
  const navigate = useNavigate();
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
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${visible ? "0" : "-16px"})`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex items-center gap-8 rounded-full border border-hairline bg-canvas/90 px-4 py-2 shadow-sm backdrop-blur">
        <img
          src={clubLogo}
          alt="C2C logo"
          className="h-8 w-8 rounded-full border border-hairline-strong object-contain p-0.5 invert"
        />

        <ul className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="font-body text-sm text-slate transition hover:text-graphite"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate("/login")}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-dark"
        >
          Compete
        </button>
      </div>
    </nav>
  );
}
