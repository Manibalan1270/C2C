import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import Carousel from "../Carousel";
import { fetchPublishedEvents } from "../../lib/queries/site";
import type { SiteEventDoc } from "../../types/schema";

/**
 * Club events on the public landing page.
 *
 * Reads `siteEvents`, which is edited at /admin/events. It used to read
 * `weeklyChallenges` instead — the members-only weekly problem set — so every
 * challenge an admin posted for members was published to the public homepage
 * as though it were an event. The two are unrelated content with unrelated
 * audiences and no longer share a collection.
 */

/** Shown until siteEvents has content — the club's real events, as examples. */
type EventCard = Pick<
  SiteEventDoc,
  "eventId" | "title" | "description" | "dateLabel" | "location" | "imageUrl"
>;

const PLACEHOLDERS: EventCard[] = [
  {
    eventId: "placeholder-1",
    title: "C2C Hack Day",
    description: "A full day of building, mentoring and demos.",
    dateLabel: "Add a date",
    location: null,
    imageUrl: null,
  },
  {
    eventId: "placeholder-2",
    title: "Weekly Contest Kickoff",
    description: "Our recurring contest, open to every member.",
    dateLabel: "Add a date",
    location: null,
    imageUrl: null,
  },
  {
    eventId: "placeholder-3",
    title: "DSA Bootcamp",
    description: "Structured problem solving from the ground up.",
    dateLabel: "Add a date",
    location: null,
    imageUrl: null,
  },
];

export default function Events() {
  const [events, setEvents] = useState<EventCard[]>(PLACEHOLDERS);

  useEffect(() => {
    async function load() {
      try {
        const docs = await fetchPublishedEvents(8);
        if (docs.length > 0) setEvents(docs);
      } catch (err) {
        // Placeholders are the right fallback — a marketing page must never
        // render an error — but swallowing the reason made this section
        // undebuggable: "the homepage shows sample content" looks identical
        // whether the collection is empty, the rules deny the read, or a
        // composite index is missing. Log it so the cause is one console
        // glance away.
        console.warn(
          "[C2C] Events: falling back to placeholders. Cause:",
          err,
          "\nIf this is a permission or index error, run: npm run deploy:rules",
        );
      }
    }
    load();
  }, []);

  return (
    <section id="events" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeading>Events</SectionHeading>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10"
        >
          <Carousel
            items={events}
            tone="light"
            renderItem={(event) => (
              <div className="rounded-2xl bg-surface-muted p-6 sm:p-8">
                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-hairline-strong/50">
                  {event.imageUrl ? (
                    // Cropped to 4:3 on upload, so this matches the frame
                    // exactly and object-cover is a safety net, not a crop.
                    <img
                      src={event.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-widest text-slate">
                      Event Photo
                    </span>
                  )}
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-graphite">
                  {event.title}
                </h3>
                {(event.dateLabel || event.location) && (
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-slate">
                    {[event.dateLabel, event.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {event.description && (
                  <p className="mt-3 text-sm text-slate">{event.description}</p>
                )}
              </div>
            )}
          />
        </motion.div>
      </div>
    </section>
  );
}
