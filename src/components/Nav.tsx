import { useNavigate } from "react-router-dom";
import clubLogo from "../assets/club-logo.jpeg";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Board Members", href: "#board" },
];

export default function Nav() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <img
          src={clubLogo}
          alt="C2C logo"
          className="h-8 w-8 rounded-full border border-hairline-strong object-cover invert"
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
          className="rounded-full bg-graphite px-4 py-1.5 text-sm font-medium text-canvas transition hover:bg-slate"
        >
          Compete
        </button>
      </div>
    </header>
  );
}
