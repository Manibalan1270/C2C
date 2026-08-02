import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import Carousel from "./Carousel";
import { fetchPublishedPosts } from "../../lib/queries/site";
import type { BlogPostDoc } from "../../types/schema";

const CATEGORY_LABEL: Record<BlogPostDoc["category"], string> = {
  news: "News",
  journey: "Journey",
};

function excerptOf(body: string, max = 140) {
  return body.length > max ? `${body.slice(0, max).trimEnd()}…` : body;
}

/**
 * Placeholder cards shown until a real post is published.
 *
 * These used to read as genuine posts — "From zero to first hackathon win",
 * "One member's story of going from 'What's a linked list?' to a winning SIH
 * team". On a public marketing page that is fabricated content: a visitor
 * cannot tell it from something the club actually wrote, so the site would
 * have been advertising a hackathon win that may never have happened.
 *
 * Rewritten to be unmistakably empty-state copy, matching how the Events and
 * Board sections handle the same situation ("Add a date", "Add Name"). The
 * cost of an obviously-unfinished section is far lower than the cost of a
 * plausible lie.
 */
const MOCK_POSTS: BlogPostDoc[] = [
  {
    postId: "mock-1",
    title: "No posts yet",
    category: "news",
    author: "mock",
    status: "published",
    body: "Club news and write-ups will appear here once the first post is published.",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedAt: null as any,
  },
];

export default function BlogPreview() {
  const [posts, setPosts] = useState<BlogPostDoc[]>(MOCK_POSTS);

  useEffect(() => {
    async function load() {
      try {
        const docs = await fetchPublishedPosts(6);
        if (docs.length > 0) setPosts(docs);
      } catch (err) {
        // See the note in Events.tsx — placeholders are the right fallback,
        // but the reason must not vanish with it.
        console.warn(
          "[C2C] Blog: falling back to placeholders. Cause:",
          err,
          "\nIf this is a permission or index error, run: npm run deploy:rules",
        );
      }
    }
    load();
  }, []);

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
            items={posts}
            tone="light"
            renderItem={(post) => (
              <Link
                to={`/blog/${post.postId}`}
                // The placeholder cards aren't real posts and have nowhere to
                // go, so they stay inert rather than linking to a 404.
                onClick={(e) => {
                  if (post.postId.startsWith("mock-")) e.preventDefault();
                }}
                className="block rounded-2xl border border-hairline bg-surface p-6 transition-colors hover:border-hairline-strong sm:p-8"
              >
                <span className="font-mono text-xs uppercase tracking-wider text-slate">
                  {CATEGORY_LABEL[post.category]}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-graphite">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-slate">{excerptOf(post.body)}</p>
                {post.authorName && (
                  <p className="mt-4 font-mono text-xs text-slate">
                    {/* Denormalised at write time — the public can't read
                        `users` to resolve the author uid. */}
                    {post.authorName}
                  </p>
                )}
                {!post.postId.startsWith("mock-") && (
                  <span className="mt-4 block font-mono text-xs text-accent">
                    Read post →
                  </span>
                )}
              </Link>
            )}
          />
        </motion.div>
      </div>
    </section>
  );
}
