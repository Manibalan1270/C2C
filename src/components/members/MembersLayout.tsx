import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  PiChartLineUpDuotone,
  PiMoonDuotone,
  PiShieldDuotone,
  PiSignOutBold,
  PiSunDuotone,
  PiTrophyDuotone,
  PiUserCircleDuotone,
  PiLightningDuotone,
} from "react-icons/pi";
import { useAuth } from "../../lib/AuthContext";
import { useTheme } from "../../lib/ThemeContext";
import { auth } from "../../lib/firebase";
import { levelForXp, xpIntoLevel, XP_PER_LEVEL } from "../../lib/gamification";
import GalaxyBackground from "./GalaxyBackground";
import CursorGlow from "./CursorGlow";
import WelcomeOverlay from "./WelcomeOverlay";
import clubLogo from "../../assets/club-logo-transparent.png";

const BASE_TABS = [
  { to: "/dashboard", label: "Dashboard", icon: PiChartLineUpDuotone },
  { to: "/profile", label: "Profile", icon: PiUserCircleDuotone },
  { to: "/challenges", label: "Challenges", icon: PiLightningDuotone },
  { to: "/leaderboard", label: "Leaderboard", icon: PiTrophyDuotone },
];

export default function MembersLayout() {
  const { user, userDoc, role, docLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(() => {
    if (role !== "admin" && role !== "super_admin") return BASE_TABS;
    return [...BASE_TABS, { to: "/admin", label: "Admin", icon: PiShieldDuotone }];
  }, [role]);

  // Read once on mount: arriving via /welcome plays the curtain, and any
  // later navigation between tabs won't retrigger it.
  const [showWelcome, setShowWelcome] = useState(
    () => (location.state as { welcome?: boolean } | null)?.welcome === true,
  );
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  // Hand the theme to the browser's own UI (scrollbars, form controls) for as
  // long as we're inside the members area, and give it back on the way out —
  // see the note in index.css for why this isn't just a CSS rule.
  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = theme;
    return () => {
      root.style.colorScheme = "";
    };
  }, [theme]);

  async function handleSignOut() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <div className="relative min-h-screen bg-galaxy-void text-galaxy-text">
      <GalaxyBackground variant="ambient" />
      <CursorGlow />
      {showWelcome && <WelcomeOverlay onDone={dismissWelcome} />}

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* A solid bar pinned to the top edge, not a floating glass pill. The
            pill read as glass because it was translucent over a busy galaxy;
            with the galaxy turned down there is nothing to see through it, and
            a flat full-width bar with one hairline underneath is what the
            LeetCode direction actually calls for. */}
        <div className="sticky top-0 z-30 border-b border-galaxy-line bg-galaxy-nav">
          <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4">
            <Link
              to="/"
              title="Back to the club website"
              className="group shrink-0 transition-opacity hover:opacity-90"
            >
              {/* The targeting-reticle brackets that used to frame this are
                  gone: they were the last of the HUD motif, and corner
                  brackets around a wordmark read as sci-fi chrome next to a
                  flat product bar. HudFrame itself is left in the tree rather
                  than deleted — nothing else uses it now. */}
              <span className="flex items-center gap-2">
                <img
                  src={clubLogo}
                  alt=""
                  className="h-6 w-6 rounded-full object-contain"
                />
                <span className="font-tech text-sm font-semibold tracking-[0.06em] text-galaxy-text">
                  C2C
                </span>
              </span>
            </Link>

            {/* Left-aligned against the wordmark, as in the reference, rather
                than centred in the bar. */}
            <nav className="flex flex-1 flex-wrap items-center gap-6">
              {tabs.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center gap-2 px-1 py-4 font-tech text-[0.9rem] font-medium transition-colors duration-150",
                      isActive
                        ? "text-galaxy-text"
                        : "text-galaxy-muted hover:text-galaxy-text",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                      {/* The active tab is marked by a rule sitting on the
                          bar's own bottom border, not by a filled pill — that
                          is how the reference distinguishes it, and it keeps
                          the bar reading as one continuous edge. */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 -bottom-px h-0.5 bg-galaxy-text"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex items-center gap-2.5 rounded-full border border-galaxy-line bg-galaxy-deep py-1 pl-1 pr-3.5">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-galaxy-accent to-galaxy-accent-hover" />
                )}
                <div className="text-[0.7rem] leading-tight">
                  <p className="font-tech font-medium tracking-wide">
                    {user?.displayName?.split(" ")[0] ?? "Member"}
                  </p>
                  <p className="font-mono tabular-nums text-galaxy-muted">
                    {/* A dash while the first snapshot is pending — never a
                        flash of "LV.1 / 0 XP" for a returning member whose
                        real numbers just haven't arrived yet. */}
                    {docLoading || !userDoc ? (
                      "LV.· · —/500"
                    ) : (
                      <>
                        LV.{levelForXp(userDoc.xp)} · {xpIntoLevel(userDoc.xp)}/
                        {XP_PER_LEVEL}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                // The label names the destination, not the current state — the
                // icon already shows where you are, and a control that says
                // "Dark" while the screen is dark reads as a status readout.
                aria-label={
                  theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
                }
                aria-pressed={theme === "light"}
                className="grid h-8 w-8 place-items-center rounded-full bg-galaxy-control text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
              >
                {theme === "dark" ? (
                  <PiSunDuotone className="h-4 w-4" />
                ) : (
                  <PiMoonDuotone className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="grid h-8 w-8 place-items-center rounded-full bg-galaxy-control text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
              >
                <PiSignOutBold className="h-4 w-4" />
              </button>
            </div>
          </header>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Outlet />
        </main>

        <footer className="mx-auto w-full max-w-6xl px-6 pb-8">
          <Link
            to="/"
            className="font-tech text-xs tracking-wide text-galaxy-muted transition-colors hover:text-galaxy-text"
          >
            ← Back to the club website
          </Link>
        </footer>
      </div>
    </div>
  );
}
