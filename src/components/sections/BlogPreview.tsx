import SectionHeading from "../SectionHeading";

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
    <section id="blog" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHeading>Blog</SectionHeading>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {MOCK_POSTS.map((post) => (
          <article
            key={post.title}
            className="rounded-2xl border border-hairline bg-canvas p-6"
          >
            <span className="font-mono text-xs uppercase tracking-wider text-slate">
              {post.category}
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold text-graphite">
              {post.title}
            </h3>
            <p className="mt-3 text-sm text-slate">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
