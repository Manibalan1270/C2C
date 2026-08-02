import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import ContactFooter from "../components/sections/ContactFooter";
import { fetchPost } from "../lib/queries/site";
import type { BlogPostDoc } from "../types/schema";

const CATEGORY_LABEL: Record<BlogPostDoc["category"], string> = {
  news: "News",
  journey: "Journey",
};

function formatDate(post: BlogPostDoc): string | null {
  const ms = post.createdAt?.toMillis?.();
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * A single blog post, public.
 *
 * The landing page has always shown a 140-character excerpt with nothing
 * behind it, so posts were written in full and then unreadable. This is the
 * page that excerpt links to.
 *
 * Drafts 404 here even though the security rules permit reading them. The
 * rules are permissive because a list query can't filter on a field the rule
 * doesn't index, but "readable" and "published" are different questions and
 * the public site should answer the second one.
 */
export default function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<BlogPostDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!postId) {
        setState("missing");
        return;
      }
      try {
        const doc = await fetchPost(postId);
        if (cancelled) return;
        if (!doc || doc.status !== "published") {
          setState("missing");
          return;
        }
        setPost(doc);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        console.warn("[C2C] Blog post read failed:", err);
        setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // Give the tab a useful name, and restore it on the way out so a client-side
  // navigation back to the home page doesn't keep the post's title.
  useEffect(() => {
    if (!post) return;
    const previous = document.title;
    document.title = `${post.title} — C2C`;
    return () => {
      document.title = previous;
    };
  }, [post]);

  const published = post ? formatDate(post) : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Nav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <Link
          to="/#blog"
          className="font-mono text-xs uppercase tracking-wider text-slate transition-colors hover:text-graphite"
        >
          ← All posts
        </Link>

        {state === "loading" && (
          <p className="mt-16 text-center text-sm text-slate">Loading…</p>
        )}

        {state === "error" && (
          <p className="mt-16 text-center text-sm text-slate">
            That post couldn't be loaded. Try again in a moment.
          </p>
        )}

        {state === "missing" && (
          <div className="mt-16 text-center">
            <h1 className="font-display text-3xl font-semibold text-graphite">
              That post doesn't exist
            </h1>
            <p className="mt-3 text-sm text-slate">
              It may have been removed, or the link may be wrong.
            </p>
          </div>
        )}

        {state === "ready" && post && (
          <article className="mt-8">
            <span className="font-mono text-xs uppercase tracking-wider text-slate">
              {CATEGORY_LABEL[post.category]}
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-graphite">
              {post.title}
            </h1>

            {(post.authorName || published) && (
              <p className="mt-4 font-mono text-xs text-slate">
                {[post.authorName, published].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Body is plain text, not HTML — it comes from an admin textarea,
                and rendering it as markup would be an injection hole for the
                sake of formatting nobody has asked for yet. `whitespace-pre-wrap`
                preserves the paragraph breaks they actually typed. */}
            <div className="mt-8 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-graphite">
              {post.body}
            </div>
          </article>
        )}
      </main>

      <ContactFooter />
    </div>
  );
}
