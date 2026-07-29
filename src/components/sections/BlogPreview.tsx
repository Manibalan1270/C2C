import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import Carousel from "../Carousel";

const MOCK_POSTS = [
  {
    title: "How we run our weekly challenges",
    category: "News",
    excerpt: "A behind-the-scenes look at how Easy/Medium/Hard problems get picked each week.",
  },
  {
    title: "From zero to first hackathon win",
    category: "Journey",
    excerpt: "One member's story of going from 'What's a linked list?' to a winning SIH team.",
  },
  {
    title: "Building the C2C leaderboard",
    category: "News",
    excerpt: "What goes into ranking members fairly — and why XP beats raw problem count.",
  },
];

export default function BlogPreview() {
  return (
    <section id="blog" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeading>Blog</SectionHeading>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10"
        >
          <Carousel
            items={MOCK_POSTS}
            tone="light"
            renderItem={(post) => (
              <article className="rounded-2xl border border-hairline bg-canvas p-6 sm:p-8">
                <span className="font-mono text-xs uppercase tracking-wider text-slate">
                  {post.category}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-graphite">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-slate">{post.excerpt}</p>
              </article>
            )}
          />
        </motion.div>
      </div>
    </section>
  );
}
