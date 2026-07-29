import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";

const EVENTS = [
  {
    title: "C2C Hack Day",
    description:
      "Our flagship hackathon challenges participants to build creative, user-friendly solutions to real-world problems — with top teams winning prizes and bragging rights.",
  },
  {
    title: "Weekly Contest Kickoff",
    description:
      "A fast-paced Easy/Medium/Hard sprint every week, with live leaderboard updates as members submit solutions.",
  },
  {
    title: "DSA Bootcamp",
    description:
      "A multi-week crash course on data structures and algorithms for members prepping for placements and competitive programming.",
  },
];

export default function Events() {
  return (
    <section id="events" className="mx-auto max-w-5xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading>Events</SectionHeading>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {EVENTS.map((event, i) => (
          <motion.div
            key={event.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-2xl bg-stone-200/80 p-6"
          >
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-stone-300/60">
              <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
                Event Photo
              </span>
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-graphite">
              {event.title}
            </h3>
            <p className="mt-3 text-sm text-slate">{event.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
