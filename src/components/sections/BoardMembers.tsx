import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import { InfiniteSlider } from "../ui/infinite-slider";

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
        className="mt-10"
      >
        <InfiniteSlider gap={40} duration={28} durationOnHover={70} className="py-4">
          {MOCK_MEMBERS.map((member) => (
            <div
              key={member.role}
              className="flex w-[180px] shrink-0 flex-col items-center text-center"
            >
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-hairline bg-surface">
                <span className="font-display text-2xl text-slate">?</span>
              </div>
              <h3 className="mt-4 font-serif text-lg text-graphite">{member.name}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate">
                {member.role}
              </p>
            </div>
          ))}
        </InfiniteSlider>
      </motion.div>
    </section>
  );
}
