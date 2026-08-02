import { NavLink, Outlet } from "react-router-dom";
import {
  PiBellDuotone,
  PiCalendarStarDuotone,
  PiGaugeDuotone,
  PiLightningDuotone,
  PiMedalDuotone,
  PiNotePencilDuotone,
  PiUsersDuotone,
  PiUsersFourDuotone,
} from "react-icons/pi";

/**
 * Split into two groups because they answer to different audiences: the first
 * five change what MEMBERS see inside the app, the last three change what the
 * PUBLIC sees on the marketing site. Keeping that boundary visible in the nav
 * is the cheapest guard against the mistake this section was built to fix —
 * posting something for members and having it appear on the homepage.
 */
const ADMIN_TABS = [
  { to: "/admin", label: "Overview", icon: PiGaugeDuotone, end: true },
  { to: "/admin/members", label: "Members", icon: PiUsersDuotone, end: false },
  { to: "/admin/challenges", label: "Challenges", icon: PiLightningDuotone, end: false },
  { to: "/admin/announcements", label: "Announcements", icon: PiBellDuotone, end: false },
  { to: "/admin/badges", label: "Badges", icon: PiMedalDuotone, end: false },
];

const SITE_TABS = [
  { to: "/admin/events", label: "Events", icon: PiCalendarStarDuotone, end: false },
  { to: "/admin/board", label: "Board", icon: PiUsersFourDuotone, end: false },
  { to: "/admin/blog", label: "Blog", icon: PiNotePencilDuotone, end: false },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 font-tech text-[0.8rem] font-medium transition-colors",
    isActive
      ? "bg-galaxy-surface-hover text-galaxy-text"
      : "text-galaxy-muted hover:bg-galaxy-surface-hover/60 hover:text-galaxy-text",
  ].join(" ");

/**
 * Shell for the admin section. Its own sub-nav rather than more entries in
 * the members nav: these are a different kind of action on a different
 * audience, and mixing "look at my streak" with "change someone's role" in
 * one bar makes the destructive things too easy to hit by accident.
 */
export default function AdminLayout() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-tech text-[0.7rem] uppercase tracking-[0.24em] text-galaxy-accent-text">
          Admin
        </p>
        <h1 className="mt-2 font-tech text-2xl font-semibold tracking-tight">
          Club administration
        </h1>
      </header>

      <nav className="flex flex-col gap-2 border-b border-galaxy-line pb-3">
        {/* Scrolls rather than wraps, same reasoning as the main nav: eight
            tabs across two groups turn into five ragged rows at 360px, and the
            App/Site grouping — the whole point of the split — stops being
            legible once each group spans several lines. */}
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto">
          <span className="mr-1 shrink-0 font-tech text-[0.6rem] uppercase tracking-[0.18em] text-galaxy-dim">
            App
          </span>
          {ADMIN_TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto">
          <span className="mr-1 shrink-0 font-tech text-[0.6rem] uppercase tracking-[0.18em] text-galaxy-dim">
            Site
          </span>
          {SITE_TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
