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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="scrollbar-hide mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 sm:justify-center"
      >
        {EVENTS.map((event) => (
          <div
            key={event.title}
            className="w-[85%] shrink-0 snap-center rounded-3xl border border-hairline bg-graphite p-6 sm:w-[380px] sm:p-8"
          >
            <div className="flex aspect-[4/3] w-full -rotate-2 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <span className="font-mono text-xs uppercase tracking-widest text-white/30">
                Event Photo
              </span>
            </div>
            <h3 className="mt-6 font-display text-2xl font-semibold text-white">
              {event.title}
            </h3>
            <p className="mt-3 text-sm text-white/70">{event.description}</p>
          </div>
        ))}
      </motion.div>

      <p className="mt-4 text-center font-mono text-xs text-slate sm:hidden">
        ← swipe to see more →
      </p>
    </section>
  );
}
