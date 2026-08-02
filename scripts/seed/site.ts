/**
 * Starter content for the PUBLIC landing page — events, board members, blog.
 *
 * Deliberately generic and clearly placeholder in tone. A seed that invents
 * plausible-looking specifics (real names, real dates, a real venue) is worse
 * than an empty page: nobody can tell it apart from content someone actually
 * wrote, so it survives to production and the club ends up advertising an
 * event that never existed. Everything here is obviously a template waiting to
 * be replaced.
 *
 * No images. Photos are cropped and embedded by the admin UI, and a seeded
 * placeholder image would just be several hundred KB of grey rectangle written
 * into every environment.
 */

export interface SiteEventSeed {
  /** Deterministic doc id, so re-seeding converges instead of duplicating. */
  seedId: string;
  title: string;
  description: string;
  dateLabel: string;
  startDate: string | null;
  location: string | null;
  order: number;
  published: boolean;
}

export const SITE_EVENT_SEEDS: SiteEventSeed[] = [
  {
    seedId: "seed-weekly-contest",
    title: "Weekly Contest",
    description:
      "Our recurring contest, open to every member. Problems go up on the challenges board and XP is awarded automatically.",
    dateLabel: "Every Friday",
    // Recurring, so no date — it must never expire off the site.
    startDate: null,
    location: null,
    order: 10,
    published: true,
  },
  {
    seedId: "seed-dsa-bootcamp",
    title: "DSA Bootcamp",
    description:
      "Structured problem solving from the ground up, for members who want a route into competitive programming.",
    dateLabel: "Add a date",
    startDate: null,
    location: null,
    order: 20,
    // Unpublished: it's a template, not an announcement. Fill it in, then tick
    // "Visible on the public site".
    published: false,
  },
  {
    seedId: "seed-hack-day",
    title: "C2C Hack Day",
    description:
      "A full day of building, mentoring and demos. Teams form on the morning; anyone can join.",
    dateLabel: "Add a date",
    startDate: null,
    location: null,
    order: 30,
    published: false,
  },
];

export interface BoardMemberSeed {
  seedId: string;
  name: string;
  title: string;
  order: number;
  published: boolean;
}

/**
 * Board slots, not board members.
 *
 * Published as false across the board: these are empty chairs with titles on
 * them, and pushing "Add Name — Chairperson" live would look broken. Fill in a
 * real name and photo, then publish.
 */
export const BOARD_MEMBER_SEEDS: BoardMemberSeed[] = [
  { seedId: "seed-chair", name: "Add Name", title: "Chairperson", order: 10, published: false },
  { seedId: "seed-vice", name: "Add Name", title: "Vice Chairperson", order: 20, published: false },
  { seedId: "seed-tech", name: "Add Name", title: "Technical Lead", order: 30, published: false },
  { seedId: "seed-events", name: "Add Name", title: "Events Lead", order: 40, published: false },
  { seedId: "seed-design", name: "Add Name", title: "Design Lead", order: 50, published: false },
];

export interface BlogPostSeed {
  seedId: string;
  title: string;
  category: "news" | "journey";
  status: "draft" | "published";
  body: string;
}

export const BLOG_POST_SEEDS: BlogPostSeed[] = [
  {
    seedId: "seed-welcome",
    title: "Welcome to Compete to Compute",
    category: "news",
    status: "draft",
    body:
      "This is a starter post so the blog section has something to render.\n\n" +
      "Replace it from Admin → Site → Blog. Posts support plain text with " +
      "paragraph breaks; the landing page shows the first 140 characters as an " +
      "excerpt, and the full text lives on its own page.\n\n" +
      "Set the status to Published when a post is ready to go live.",
  },
];
