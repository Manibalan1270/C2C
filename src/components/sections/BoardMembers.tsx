import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";

const MOCK_MEMBERS = [
  { name: "Add Name", role: "Chairperson" },
  { name: "Add Name", role: "Vice Chairperson" },
  { name: "Add Name", role: "Technical Lead" },
  { name: "Add Name", role: "Events Lead" },
  { name: "Add Name", role: "Design Lead" },
];

export default function BoardMembers() {
  return (
    <section id="board" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeading>Board Members</SectionHeading>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="scrollbar-hide mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 sm:justify-center"
      >
        {MOCK_MEMBERS.map((member) => (
          <div
            key={member.role}
            className="flex w-[45%] shrink-0 snap-center flex-col items-center text-center sm:w-[180px]"
          >
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-hairline bg-canvas">
              <span className="font-display text-2xl text-slate">?</span>
            </div>
            <h3 className="mt-4 font-serif text-lg text-graphite">{member.name}</h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate">
              {member.role}
            </p>
          </div>
        ))}
      </motion.div>

      <p className="mt-4 text-center font-mono text-xs text-slate sm:hidden">
        ← swipe to see more →
      </p>
    </section>
  );
}
