import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import { InfiniteSlider } from "../ui/infinite-slider";
import { fetchPublishedBoardMembers } from "../../lib/queries/site";
import type { BoardMemberDoc } from "../../types/schema";

/**
 * The board listing on the public landing page.
 *
 * Reads `boardMembers`, edited at /admin/board. It used to be derived from
 * `users where role in (admin, super_admin)`, which had two problems: it made
 * "give this person admin access" and "put this person on the public homepage"
 * the same irreversible action, and it required reading the `users` collection
 * — which anonymous visitors are not permitted to do, so the section silently
 * fell back to placeholders for everyone who wasn't logged in.
 */

type BoardCard = Pick<
  BoardMemberDoc,
  "memberId" | "name" | "title" | "imageUrl" | "linkUrl"
>;

const PLACEHOLDERS: BoardCard[] = [
  { memberId: "placeholder-0", name: "Add Name", title: "Chairperson", imageUrl: null, linkUrl: null },
  { memberId: "placeholder-1", name: "Add Name", title: "Vice Chairperson", imageUrl: null, linkUrl: null },
  { memberId: "placeholder-2", name: "Add Name", title: "Technical Lead", imageUrl: null, linkUrl: null },
  { memberId: "placeholder-3", name: "Add Name", title: "Events Lead", imageUrl: null, linkUrl: null },
  { memberId: "placeholder-4", name: "Add Name", title: "Design Lead", imageUrl: null, linkUrl: null },
];

export default function BoardMembers() {
  const [members, setMembers] = useState<BoardCard[]>(PLACEHOLDERS);

  useEffect(() => {
    async function load() {
      try {
        const docs = await fetchPublishedBoardMembers();
        if (docs.length > 0) setMembers(docs);
      } catch (err) {
        // See the note in Events.tsx — placeholders are the right fallback,
        // but the reason must not vanish with it.
        console.warn(
          "[C2C] Board members: falling back to placeholders. Cause:",
          err,
          "\nIf this is a permission or index error, run: npm run deploy:rules",
        );
      }
    }
    load();
  }, []);

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
          {members.map((member) => {
            const card = (
              <>
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface">
                  {member.imageUrl ? (
                    // Cropped square on upload, so the circle never distorts.
                    <img
                      src={member.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-2xl text-slate">?</span>
                  )}
                </div>
                <h3 className="mt-4 font-serif text-lg text-graphite">{member.name}</h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate">
                  {member.title}
                </p>
              </>
            );

            return member.linkUrl ? (
              <a
                key={member.memberId}
                href={member.linkUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex w-[180px] shrink-0 flex-col items-center text-center transition-opacity hover:opacity-80"
              >
                {card}
              </a>
            ) : (
              <div
                key={member.memberId}
                className="flex w-[180px] shrink-0 flex-col items-center text-center"
              >
                {card}
              </div>
            );
          })}
        </InfiniteSlider>
      </motion.div>
    </section>
  );
}
